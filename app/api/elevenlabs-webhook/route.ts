import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '../../../lib/mongodb'; 
import { ObjectId } from 'mongodb';
import { sendDiscordAlert } from '../../../lib/monitoringUtils';
import { logger } from '../../../lib/logger';
import { type SessionStatus, type SessionMetadata, type EmailedResultLogEntry } from '../../../lib/types/session'; // Import from shared types

const ELEVENLABS_WEBHOOK_SECRET = process.env.ELEVENLABS_WEBHOOK_SECRET;
const FIVE_MINUTES_IN_SECONDS = 5 * 60;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

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
      logger.info({ event: 'WebhookAction', message: 'Conditions MET. Attempting to enqueue scoring with retries.', details: { sessionId: webhookSessionIdFromPayload } });
      
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; 
      const scoreSessionUrl = `${appUrl}/api/score-session`;
      
      attempt = 0;
      success = false;
      lastErrorForDb = null;

      while (attempt < MAX_RETRIES && !success) {
        attempt++;
        logger.info({ event: 'WebhookAction', message: `Enqueue attempt ${attempt}/${MAX_RETRIES}`, details: { sessionId: webhookSessionIdFromPayload, url: scoreSessionUrl } });
        try {
          const response = await fetch(scoreSessionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: webhookSessionIdFromPayload, rubricId: rubricIdToUse }),
            // Consider adding a timeout to the fetch call itself if your platform supports AbortController easily
            // signal: AbortSignal.timeout(10000) // Example: 10 second timeout for the fetch
          });

          logger.info({ event: 'WebhookAction', message: `Internal call responded (attempt ${attempt})`, details: { sessionId: webhookSessionIdFromPayload, ok: response.ok, status: response.status } });

          if (response.ok) {
            success = true;
            lastErrorForDb = null; // Clear any previous attempt errors
            break; // Exit retry loop on success
          }
          
          // If response not ok, prepare error for logging and potential retry
          const errorData = await response.json().catch(() => ({ message: "Scoring API call failed with non-OK response, and failed to parse error JSON." }));
          triggerError = errorData.message || `Scoring API error (attempt ${attempt}): ${response.status}`;
          lastErrorForDb = triggerError; 
          logger.warn({ event: 'WebhookEnqueueNonOkResponse', message: `Non-OK response from /api/score-session (attempt ${attempt})`, details: { sessionId: webhookSessionIdFromPayload, status: response.status }, error: triggerError });

        } catch (fetchError: any) {
          logger.warn({ event: 'WebhookEnqueueFetchError', message: `Fetch error (attempt ${attempt})`, details: { sessionId: webhookSessionIdFromPayload }, error: fetchError.message });
          triggerError = fetchError.message || `Network error or scoring service unavailable (attempt ${attempt}).`;
          lastErrorForDb = triggerError;
        }

        if (!success && attempt < MAX_RETRIES) {
          const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
          logger.info({ event: 'WebhookEnqueueRetryDelay', message: `Waiting ${delay}ms before next retry.`, details: { sessionId: webhookSessionIdFromPayload, delay } });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // Determine final status based on retry outcomes
      const finalScoringTriggerStatus: SessionStatus = success ? 'scoring_enqueued' : 'scoring_enqueue_failed';
      
      try {
        await db.collection<SessionMetadata>('sessions_metadata').updateOne(
            { sessionId: webhookSessionIdFromPayload }, 
            { 
              $set: { 
                status: finalScoringTriggerStatus, 
                status_updated_at: new Date(), 
                status_error: lastErrorForDb, 
                updatedAt: new Date() 
              }
            }
        );
        logger.info({ event: 'WebhookEnqueueFinalStatusUpdate', details: { sessionId: webhookSessionIdFromPayload, status: finalScoringTriggerStatus, error: lastErrorForDb } });
        
        if (finalScoringTriggerStatus === 'scoring_enqueue_failed') {
          sendDiscordAlert(
            "Scoring Enqueue Failed", 
            `Failed to enqueue scoring task for session ID: ${webhookSessionIdFromPayload} after ${MAX_RETRIES} retries.`, 
            [{ name: "Session ID", value: webhookSessionIdFromPayload || 'N/A', inline: true }, { name: "Error", value: lastErrorForDb || 'N/A', inline: false }]
          );
        }
      } catch (dbUpdateError: any) {
        logger.error({ event: 'WebhookDBError', message: 'Failed to update session metadata after enqueue attempt', details: { sessionId: webhookSessionIdFromPayload, status: finalScoringTriggerStatus }, error: dbUpdateError.message });
      }
      
      if (!success) {
        return NextResponse.json({ message: 'Webhook received, but failed to enqueue scoring task after multiple retries.', internal_error: triggerError }, { status: 200 });
      }
      return NextResponse.json({ message: `Webhook received, scoring process initiated successfully after ${attempt} attempt(s).` }, { status: 200 });

    } else {
      logger.info({ event: 'WebhookAction', message: 'Conditions NOT MET for session. Scoring not triggered.', details: { sessionId: webhookSessionIdFromPayload, callStatus } });
      try {
        await db.collection<SessionMetadata>('sessions_metadata').updateOne(
          { sessionId: webhookSessionIdFromPayload }, 
          { $set: { status: 'webhook_received_not_scored', status_updated_at: new Date(), "payload.webhook_end_reason": endReason, "payload.webhook_call_status": callStatus, updatedAt: new Date() } }
        );
        logger.info({ event: 'WebhookStatusUpdated', details: { sessionId: webhookSessionIdFromPayload, newStatus: 'webhook_received_not_scored' } });
      } catch (dbUpdateError: any) {
        logger.error({ event: 'WebhookDBError', message: 'Failed to update session to webhook_received_not_scored', details: { sessionId: webhookSessionIdFromPayload }, error: dbUpdateError.message });
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