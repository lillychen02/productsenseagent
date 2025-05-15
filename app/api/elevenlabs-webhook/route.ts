import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '../../../lib/mongodb'; 
import { ObjectId } from 'mongodb';

const ELEVENLABS_WEBHOOK_SECRET = process.env.ELEVENLABS_WEBHOOK_SECRET;
const FIVE_MINUTES_IN_SECONDS = 5 * 60;

// Interface for data stored in sessions_metadata
interface SessionMetadata {
  _id?: ObjectId;
  sessionId: string;
  rubricId: ObjectId; // Stored as ObjectId
  rubricName?: string; 
  interviewType?: string;
  startTime: Date;
  status: string;
  updatedAt: Date;
}

async function verifySignature(clonedRequest: Request): Promise<boolean> {
  if (!ELEVENLABS_WEBHOOK_SECRET) {
    console.error('ElevenLabs Webhook Secret is not configured.');
    return false;
  }

  const signatureHeader = clonedRequest.headers.get('elevenlabs-signature');
  if (!signatureHeader) {
    console.warn('Missing ElevenLabs-Signature header');
    return false;
  }

  const rawBody = await clonedRequest.text(); // Get raw body from the cloned request

  try {
    const parts = signatureHeader.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key.trim()] = value.trim();
      return acc;
    }, {} as Record<string, string>);

    const timestamp = parts.t;
    const receivedSignature = parts.v0;

    if (!timestamp || !receivedSignature) {
      console.warn('Invalid signature header format.');
      return false;
    }

    const receivedTimestampSeconds = parseInt(timestamp, 10);
    const currentTimestampSeconds = Math.floor(Date.now() / 1000);

    if (Math.abs(currentTimestampSeconds - receivedTimestampSeconds) > FIVE_MINUTES_IN_SECONDS) {
      console.warn('Webhook timestamp is too old or too far in the future (replay attack?).');
      return false;
    }

    const signedPayload = `${timestamp}.${rawBody}`;
    const hmac = crypto.createHmac('sha256', ELEVENLABS_WEBHOOK_SECRET);
    hmac.update(signedPayload);
    const computedSignature = hmac.digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(computedSignature, 'hex'), Buffer.from(receivedSignature, 'hex'))) {
      return true;
    }
    console.warn('HMAC signature mismatch.');
    return false;

  } catch (error) {
    console.error('Error during signature verification:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  console.log('[WEBHOOK START] Received ElevenLabs Webhook request.');

  let webhookSessionIdFromPayload: string | undefined = undefined; // For logging in catch blocks

  try {
    const requestCloneForVerification = request.clone();
    const requestCloneForJsonParsing = request.clone();
    console.log('[WEBHOOK INFO] Request cloned for verification and parsing.');

    const isVerified = await verifySignature(requestCloneForVerification);
    console.log(`[WEBHOOK INFO] Signature verification result: ${isVerified}`);
    if (!isVerified) {
      console.warn('[WEBHOOK WARN] Webhook verification failed. Ignoring request.');
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
    }

    console.log('[WEBHOOK INFO] Webhook signature VERIFIED.');

    let payload;
    try {
      payload = await requestCloneForJsonParsing.json();
      console.log('[WEBHOOK INFO] Webhook payload parsed successfully.');
      // console.log('[WEBHOOK PAYLOAD]', JSON.stringify(payload, null, 2)); // Verbose, uncomment if needed
    } catch (e: any) {
      console.error('[WEBHOOK ERROR] Failed to parse webhook payload as JSON:', e.message);
      // Attempt to get raw body for logging if JSON parsing failed
      try {
        const rawBody = await request.clone().text(); // Need to clone again if original already used
        console.error('[WEBHOOK ERROR] Raw webhook body for parsing error:', rawBody);
      } catch (rawBodyError: any) {
        console.error('[WEBHOOK ERROR] Could not get raw body after JSON parse error:', rawBodyError.message);
      }
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    webhookSessionIdFromPayload = payload.data?.conversation_id;
    const callStatus = payload.data?.status;
    const endReason = payload.data?.metadata?.termination_reason;

    console.log(`[WEBHOOK DATA] Extracted - webhookSessionId: ${webhookSessionIdFromPayload}, callStatus: ${callStatus}, endReason: ${endReason}`);

    if (!webhookSessionIdFromPayload) {
      console.error('[WEBHOOK ERROR] Webhook payload missing data.conversation_id.');
      return NextResponse.json({ error: 'Missing session identifier (data.conversation_id) in payload' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    console.log(`[WEBHOOK DB] Attempting to find session metadata for sessionId: ${webhookSessionIdFromPayload}`);
    const sessionMeta = await db.collection<SessionMetadata>('sessions_metadata').findOne({ sessionId: webhookSessionIdFromPayload });

    if (!sessionMeta) {
      console.error(`[WEBHOOK ERROR] No session metadata found for sessionId: ${webhookSessionIdFromPayload}. This ID should be the ElevenLabs conversation_id.`);
      return NextResponse.json({ message: 'Webhook received, but no session metadata found. Scoring not triggered.' }, { status: 200 });
    }
    console.log(`[WEBHOOK DB] Found session metadata for sessionId: ${webhookSessionIdFromPayload}. Current status: ${sessionMeta.status}`);

    const rubricIdToUse = sessionMeta.rubricId.toString();

    console.log(`[WEBHOOK DB] Attempting to update session metadata for ${webhookSessionIdFromPayload} to status: webhook_received.`);
    try {
      await db.collection<SessionMetadata>('sessions_metadata').updateOne(
        { sessionId: webhookSessionIdFromPayload }, 
        { $set: { status: 'webhook_received', "payload.webhook_end_reason": endReason, "payload.webhook_call_status": callStatus, updatedAt: new Date() } }
      );
      console.log(`[WEBHOOK DB] Successfully updated session metadata for ${webhookSessionIdFromPayload} with initial webhook data.`);
    } catch (dbUpdateError: any) {
      console.error(`[WEBHOOK DB ERROR] Failed to update session metadata for ${webhookSessionIdFromPayload} after receiving webhook:`, dbUpdateError.message);
      // Decide if you want to proceed or return an error. For now, proceeding but logging.
    }

    const appropriateEndReasons = ['client disconnected', 'agent_completed_script', 'call_ended_by_agent', 'user_ended_call', 'completed', 'ended', 'call_ended', 'end_call tool was called.'];
    
    console.log(`[WEBHOOK DECISION] Evaluating scoring for sessionId: ${webhookSessionIdFromPayload} - callStatus: '${callStatus}', endReason: '${endReason}' (lowercase: '${endReason?.toLowerCase()}')`);
    console.log(`[WEBHOOK DECISION] Condition 1 (callStatus === 'done'): ${callStatus === 'done'}`);
    console.log(`[WEBHOOK DECISION] Condition 2 (endReason exists): ${!!endReason}`);
    console.log(`[WEBHOOK DECISION] Condition 3 (appropriateEndReasons includes endReason): ${endReason && appropriateEndReasons.includes(endReason.toLowerCase())}`);

    if (callStatus === 'done' && endReason && appropriateEndReasons.includes(endReason.toLowerCase())) {
      console.log(`[WEBHOOK ACTION] Conditions MET for session ${webhookSessionIdFromPayload}. Triggering scoring with rubricId: ${rubricIdToUse}.`);
      
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : request.url; 
      
      const scoreSessionUrl = new URL('/api/score-session', baseUrl).toString();
      console.log(`[WEBHOOK ACTION] Calling internal score-session URL: ${scoreSessionUrl}`);

      fetch(scoreSessionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: webhookSessionIdFromPayload, rubricId: rubricIdToUse }),
      })
      .then(async response => {
        const statusUpdate = response.ok ? 'scoring_triggered' : 'error_scoring';
        console.log(`[WEBHOOK DB] Score session call for ${webhookSessionIdFromPayload} responded. OK: ${response.ok}. Updating status to: ${statusUpdate}`);
        try {
          await db.collection<SessionMetadata>('sessions_metadata').updateOne(
              { sessionId: webhookSessionIdFromPayload }, 
              { $set: { status: statusUpdate, updatedAt: new Date() } }
          );
          console.log(`[WEBHOOK DB] Successfully updated session metadata for ${webhookSessionIdFromPayload} to status: ${statusUpdate}.`);
        } catch (dbUpdateError: any) {
          console.error(`[WEBHOOK DB ERROR] Failed to update session metadata for ${webhookSessionIdFromPayload} to status ${statusUpdate}:`, dbUpdateError.message);
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`[WEBHOOK ERROR] Error calling /api/score-session for ${webhookSessionIdFromPayload}: ${response.status}`, errorData);
        } else {
          console.log(`[WEBHOOK INFO] Successfully triggered scoring for session ${webhookSessionIdFromPayload}.`);
        }
      })
      .catch(async error => {
        console.error(`[WEBHOOK ERROR] Fetch error when trying to trigger scoring for session ${webhookSessionIdFromPayload}:`, error);
        try {
          await db.collection<SessionMetadata>('sessions_metadata').updateOne(
              { sessionId: webhookSessionIdFromPayload }, 
              { $set: { status: 'error_scoring', updatedAt: new Date() } }
          );
          console.log(`[WEBHOOK DB] Successfully updated session metadata for ${webhookSessionIdFromPayload} to status: error_scoring due to fetch error.`);
        } catch (dbUpdateError: any) {
          console.error(`[WEBHOOK DB ERROR] Failed to update session metadata for ${webhookSessionIdFromPayload} to status error_scoring:`, dbUpdateError.message);
        }
      });
      return NextResponse.json({ message: 'Webhook received, scoring triggered.' }, { status: 200 });
    } else {
      console.log(`[WEBHOOK ACTION] Conditions NOT MET for session ${webhookSessionIdFromPayload}. Scoring not triggered.`);
      try {
        await db.collection<SessionMetadata>('sessions_metadata').updateOne(
          { sessionId: webhookSessionIdFromPayload }, 
          { $set: { status: 'webhook_received_not_scored', "payload.webhook_end_reason": endReason, "payload.webhook_call_status": callStatus, updatedAt: new Date() } }
        );
        console.log(`[WEBHOOK DB] Successfully updated session metadata for ${webhookSessionIdFromPayload} to status: webhook_received_not_scored.`);
      } catch (dbUpdateError: any) {
        console.error(`[WEBHOOK DB ERROR] Failed to update session metadata for ${webhookSessionIdFromPayload} to status webhook_received_not_scored:`, dbUpdateError.message);
      }
      return NextResponse.json({ message: 'Webhook received, scoring not applicable for this event.' }, { status: 200 });
    }
  } catch (error: any) { // Catch any other errors
    console.error(`[WEBHOOK CRITICAL] Unhandled error in webhook for session ${webhookSessionIdFromPayload || 'unknown'}:`, error.message, error.stack);
    return NextResponse.json({ error: 'Failed to process webhook due to an unexpected error' }, { status: 500 });
  }
} 