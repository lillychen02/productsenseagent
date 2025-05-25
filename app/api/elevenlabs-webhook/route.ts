import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '../../../lib/mongodb'; 
import { ObjectId } from 'mongodb';
import { sendDiscordAlert } from '../../../lib/monitoringUtils';
import { logger } from '../../../lib/logger';
import { type SessionStatus, type SessionMetadata } from '../../../lib/types/session'; // Now imports shared types
import { type ScoringJob, type ScoringJobStatus } from '../../../lib/types/jobs'; // Import job types

const ELEVENLABS_WEBHOOK_SECRET = process.env.ELEVENLABS_WEBHOOK_SECRET;
const FIVE_MINUTES_IN_SECONDS = 5 * 60;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;
const MAX_ATTEMPTS_FOR_JOB = 3; // For the job runner later, not for enqueueing itself now
const MAX_SCORING_JOB_ATTEMPTS = 3; // Max attempts for the worker to process the job

async function verifySignature(clonedRequest: Request): Promise<boolean> {
  if (!ELEVENLABS_WEBHOOK_SECRET) {
    logger.error({ event: 'WebhookSignatureVerificationError', message: 'ElevenLabs Webhook Secret is not configured.' });
    return false;
  }
  const signatureHeader = clonedRequest.headers.get('elevenlabs-signature');
  if (!signatureHeader) {
    logger.warn({ event: 'WebhookSignatureVerificationWarning', message: 'Missing ElevenLabs-Signature header' });
    return false;
  }
  const rawBody = await clonedRequest.text();
  try {
    const parts = signatureHeader.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key.trim()] = value.trim();
      return acc;
    }, {} as Record<string, string>);

    const timestamp = parts.t;
    const receivedSignature = parts.v0;

    if (!timestamp || !receivedSignature) {
      logger.warn({ event: 'WebhookSignatureVerificationWarning', message: 'Invalid signature header format.'});
      return false;
    }

    const receivedTimestampSeconds = parseInt(timestamp, 10);
    const currentTimestampSeconds = Math.floor(Date.now() / 1000);

    if (Math.abs(currentTimestampSeconds - receivedTimestampSeconds) > FIVE_MINUTES_IN_SECONDS) {
      logger.warn({ event: 'WebhookSignatureVerificationWarning', message: 'Webhook timestamp out of range.', details: { currentTimestampSeconds, receivedTimestampSeconds } });
      return false;
    }

    const signedPayload = `${timestamp}.${rawBody}`;
    const hmac = crypto.createHmac('sha256', ELEVENLABS_WEBHOOK_SECRET);
    hmac.update(signedPayload);
    const computedSignature = hmac.digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(computedSignature, 'hex'), Buffer.from(receivedSignature, 'hex'))) {
      return true;
    }
    logger.warn({ event: 'WebhookSignatureVerificationWarning', message: 'HMAC signature mismatch.'});
    return false;

  } catch (error: any) {
    logger.error({ event: 'WebhookSignatureVerificationError', message: 'Error during signature verification', error: error.message, details: { stack: error.stack } });
    return false;
  }
}

export async function POST(request: NextRequest) {
  logger.info({ event: 'WebhookReceived', details: { source: 'ElevenLabs'} });

  let webhookSessionIdFromPayload: string | undefined = undefined; // For logging in catch blocks
  let db; // ensure db is defined in the scope if used in catch
  let lastErrorForDb: string | null = null;
  let triggerError: string | null = null;
  let attempt = 0;
  let success = false;
  let rubricIdToUse: string = ''; // ensure initialized
  let callStatus: string | undefined;
  let endReason: string | undefined;
  let sessionMeta: SessionMetadata | null = null; // Define sessionMeta here

  try {
    const requestCloneForVerification = request.clone();
    const requestCloneForJsonParsing = request.clone();
    logger.info({ event: 'WebhookInfo', message: 'Request cloned for verification and parsing.' });

    const isVerified = await verifySignature(requestCloneForVerification);
    logger.info({ event: 'WebhookSignatureVerified', details: { result: isVerified } });
    if (!isVerified) {
      logger.warn({ event: 'WebhookVerificationFailed', message: 'Webhook verification failed. Ignoring request.'});
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
    }

    logger.info({ event: 'WebhookSignatureVerified', message: 'Signature was valid.' }); // Explicit log for verified

    let payload;
    try {
      payload = await requestCloneForJsonParsing.json();
      logger.info({ event: 'WebhookInfo', message: 'Webhook payload parsed successfully.' });
      // console.log('[WEBHOOK PAYLOAD]', JSON.stringify(payload, null, 2)); // Verbose, uncomment if needed
    } catch (e: any) {
      logger.error({ event: 'WebhookError', message: 'Failed to parse webhook payload as JSON:', error: e.message });
      // Attempt to get raw body for logging if JSON parsing failed
      try {
        const rawBody = await request.clone().text(); // Need to clone again if original already used
        logger.error({ event: 'WebhookError', message: 'Raw webhook body for parsing error:', details: { rawBody }});
      } catch (rawBodyError: any) {
        logger.error({ event: 'WebhookError', message: 'Could not get raw body after JSON parse error:', error: rawBodyError.message });
      }
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    webhookSessionIdFromPayload = payload.data?.conversation_id;
    callStatus = payload.data?.status;
    endReason = payload.data?.metadata?.termination_reason;

    logger.info({ event: 'WebhookDataExtracted', details: { sessionId: webhookSessionIdFromPayload, callStatus, endReason } });

    if (!webhookSessionIdFromPayload) {
      logger.error({ event: 'WebhookError', message: 'Webhook payload missing data.conversation_id.', details: { sessionId: webhookSessionIdFromPayload }});
      return NextResponse.json({ error: 'Missing session identifier (data.conversation_id) in payload' }, { status: 400 });
    }

    ({ db } = await connectToDatabase());
    logger.info({ event: 'WebhookDB', message: 'Attempting to find session metadata for sessionId:', details: { sessionId: webhookSessionIdFromPayload }});
    sessionMeta = await db.collection<SessionMetadata>('sessions_metadata').findOne({ sessionId: webhookSessionIdFromPayload });

    if (!sessionMeta) {
      logger.error({ event: 'WebhookError', message: 'No session metadata found.', details: { sessionId: webhookSessionIdFromPayload }});
      return NextResponse.json({ message: 'Webhook received, but no session metadata found. Scoring not triggered.' }, { status: 200 });
    }
    logger.info({ event: 'WebhookSessionMetaFound', details: { sessionId: webhookSessionIdFromPayload, currentStatus: sessionMeta.status } });

    rubricIdToUse = sessionMeta.rubricId.toString();
    const rubricNameToUse = sessionMeta.rubricName;
    const now = new Date();

    // After payload verification -> set status='webhook_received'
    try {
      await db.collection<SessionMetadata>('sessions_metadata').updateOne(
        { sessionId: webhookSessionIdFromPayload }, 
        { 
          $set: { 
            status: 'webhook_received', 
            status_updated_at: now,
            "payload.webhook_end_reason": endReason, 
            "payload.webhook_call_status": callStatus, 
            updatedAt: now 
          }
        }
      );
      logger.info({ event: 'WebhookStatusUpdated', details: { sessionId: webhookSessionIdFromPayload, newStatus: 'webhook_received' } });
    } catch (dbUpdateError: any) {
      logger.error({ event: 'WebhookDBError', message: 'Failed to update session metadata for webhook_received', details: { sessionId: webhookSessionIdFromPayload }, error: dbUpdateError.message });
      // Potentially critical, but let's see if scoring can still be triggered
    }

    const appropriateEndReasons = ['client disconnected', 'agent_completed_script', 'call_ended_by_agent', 'user_ended_call', 'completed', 'ended', 'call_ended', 'end_call tool was called.'];
    
    logger.info({ event: 'WebhookDecisionInfo', details: { sessionId: webhookSessionIdFromPayload, callStatus, endReason } });
    logger.info({ event: 'WebhookDecisionCondition', details: { condition: 'callStatus === done', value: callStatus === 'done' } });
    logger.info({ event: 'WebhookDecisionCondition', details: { condition: 'endReason exists', value: !!endReason } });
    logger.info({ event: 'WebhookDecisionCondition', details: { condition: 'appropriateEndReasons includes endReason', value: endReason && appropriateEndReasons.includes(endReason.toLowerCase()) } });

    if (callStatus === 'done') {
      logger.info({ event: 'WebhookScoringJobCreationAttempt', message: 'Call status is done, creating scoring job.', details: { sessionId: webhookSessionIdFromPayload }});
      
      const newScoringJob: Omit<ScoringJob, '_id'> = { // Omit _id for insertion
        sessionId: webhookSessionIdFromPayload,
        rubricId: rubricIdToUse,
        rubricName: rubricNameToUse,
        status: 'pending', // Initial status for a new job
        attempts: 0,
        max_attempts: MAX_SCORING_JOB_ATTEMPTS,
        created_at: now,
        updated_at: now,
        status_error: null, // Initialize as null
      };

      let jobCreationError: string | null = null;
      let newJobId: ObjectId | undefined = undefined;
      let finalSessionStatusForEnqueue: SessionStatus = 'scoring_enqueued';

      try {
        const insertResult = await db.collection<ScoringJob>('scoring_jobs').insertOne(newScoringJob as ScoringJob);
        if (!insertResult.insertedId) {
          throw new Error('Failed to insert scoring job, no insertedId returned.');
        }
        newJobId = insertResult.insertedId;
        logger.info({ event: 'WebhookScoringJobCreated', details: { sessionId: webhookSessionIdFromPayload, jobId: newJobId }});
      } catch (error: any) {
        logger.error({ event: 'WebhookScoringJobCreationError', message: 'Failed to create scoring job.', details: { sessionId: webhookSessionIdFromPayload }, error: error });
        jobCreationError = error.message || "Failed to insert scoring job into database.";
        finalSessionStatusForEnqueue = 'scoring_enqueue_failed';
      }

      // Update session_metadata based on job creation outcome
      try {
        await db.collection<SessionMetadata>('sessions_metadata').updateOne(
          { sessionId: webhookSessionIdFromPayload },
          { $set: { 
              status: finalSessionStatusForEnqueue, 
              status_updated_at: new Date(), 
              status_error: jobCreationError, 
              queue_job_id: newJobId?.toString() || null, // Store the new job ID if created
              updatedAt: new Date() 
            }}
        );
        logger.info({ event: 'WebhookSessionStatusAfterJobAttempt', details: { sessionId: webhookSessionIdFromPayload, status: finalSessionStatusForEnqueue, jobId: newJobId?.toString() }});
        if (finalSessionStatusForEnqueue === 'scoring_enqueue_failed') {
          sendDiscordAlert(
            "Scoring Job Creation Failed",
            `Failed to create scoring job for session ID: ${webhookSessionIdFromPayload}.`, 
            [
              { name: "Session ID", value: webhookSessionIdFromPayload!, inline: true },
              { name: "Error", value: jobCreationError || 'Unknown error', inline: false }
            ]
          );
        }
      } catch (dbUpdateError: any) {
        logger.error({ event: 'WebhookDBError', message: 'Failed to update session_metadata after scoring job attempt.', details: { sessionId: webhookSessionIdFromPayload }, error: dbUpdateError });
      }
      
      // Respond to ElevenLabs
      if (jobCreationError) {
        return NextResponse.json({ message: 'Webhook received, but failed to create scoring job.', internal_error: jobCreationError }, { status: 200 });
      }
      return NextResponse.json({ message: 'Webhook received, scoring job created successfully.' }, { status: 200 });

    } else {
      logger.info({ event: 'WebhookAction', message: 'Conditions NOT MET for session. Scoring not triggered.', details: { sessionId: webhookSessionIdFromPayload, callStatus } });
      try {
        await db.collection<SessionMetadata>('sessions_metadata').updateOne(
          { sessionId: webhookSessionIdFromPayload }, 
          { $set: { status: 'webhook_received_not_scored', status_updated_at: new Date(), "payload.webhook_end_reason": endReason, "payload.webhook_call_status": callStatus, updatedAt: new Date() } }
        );
        logger.info({ event: 'WebhookStatusUpdated', details: { sessionId: webhookSessionIdFromPayload, newStatus: 'webhook_received_not_scored' } });
      } catch (dbUpdateError: any) {
        logger.error({ event: 'WebhookDBError', message: 'Failed to update session to webhook_received_not_scored', details: { sessionId: webhookSessionIdFromPayload }, error: dbUpdateError });
      }
      return NextResponse.json({ message: 'Webhook received, scoring not applicable for this event.' }, { status: 200 });
    }
  } catch (error: any) {
    logger.error({
      event: 'WebhookCriticalError',
      message: `Unhandled error in webhook: ${error.message}`,
      details: { sessionId: webhookSessionIdFromPayload || 'unknown' },
      error: error // Pass the whole error object, which might include the stack
    });
    return NextResponse.json({ error: 'Failed to process webhook due to an unexpected error' }, { status: 500 });
  }
} 