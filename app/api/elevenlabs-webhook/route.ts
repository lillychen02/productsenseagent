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
  console.log('Received ElevenLabs Webhook...');

  const requestCloneForVerification = request.clone();
  const requestCloneForJsonParsing = request.clone(); // Second clone for JSON parsing

  const isVerified = await verifySignature(requestCloneForVerification);
  if (!isVerified) {
    console.warn('Webhook verification failed. Ignoring request.');
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
  }

  console.log('Webhook signature VERIFIED.');

  try {
    const payload = await requestCloneForJsonParsing.json(); // Use the second clone for JSON parsing
    console.log('Webhook payload:', JSON.stringify(payload, null, 2));

    const webhookSessionId = payload.data?.conversation_id;
    const callStatus = payload.data?.status;
    const endReason = payload.data?.metadata?.termination_reason;

    if (!webhookSessionId) {
      console.error('Webhook payload missing data.conversation_id.');
      return NextResponse.json({ error: 'Missing session identifier (data.conversation_id) in payload' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    // Fetch session metadata to get the rubricId
    const sessionMeta = await db.collection<SessionMetadata>('sessions_metadata').findOne({ sessionId: webhookSessionId });

    if (!sessionMeta) {
      console.error(`No session metadata found for sessionId: ${webhookSessionId}. This ID should be the ElevenLabs conversation_id.`);
      // Still return 200 to acknowledge webhook, but log error and don't score.
      return NextResponse.json({ message: 'Webhook received, but no session metadata found. Scoring not triggered.' }, { status: 200 });
    }

    const rubricIdToUse = sessionMeta.rubricId.toString(); // Convert ObjectId to string for API call

    // Update session metadata status (example)
    await db.collection<SessionMetadata>('sessions_metadata').updateOne(
      { sessionId: webhookSessionId }, 
      { $set: { status: 'webhook_received', "payload.webhook_end_reason": endReason, updatedAt: new Date() } }
    );

    const appropriateEndReasons = ['client disconnected', 'agent_completed_script', 'call_ended_by_agent', 'user_ended_call', 'completed', 'ended', 'call_ended'];
    
    if (callStatus === 'done' && endReason && appropriateEndReasons.includes(endReason.toLowerCase())) {
      console.log(`Call for session ${webhookSessionId} ended with reason: ${endReason}. Triggering scoring with rubricId: ${rubricIdToUse}.`);
      
      // Determine the correct base URL for the internal API call
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : request.url; // In production, derive from incoming request or use a fixed production URL
      
      const scoreSessionUrl = new URL('/api/score-session', baseUrl).toString();
      console.log(`Calling internal score-session URL: ${scoreSessionUrl}`);

      fetch(scoreSessionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: webhookSessionId, rubricId: rubricIdToUse }),
      })
      .then(async response => {
        const statusUpdate = response.ok ? 'scoring_triggered' : 'error_scoring';
        await db.collection<SessionMetadata>('sessions_metadata').updateOne(
            { sessionId: webhookSessionId }, 
            { $set: { status: statusUpdate, updatedAt: new Date() } }
        );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`Error calling /api/score-session for ${webhookSessionId}: ${response.status}`, errorData);
        } else {
          console.log(`Successfully triggered scoring for session ${webhookSessionId}.`);
        }
      })
      .catch(async error => {
        console.error(`Fetch error when trying to trigger scoring for session ${webhookSessionId}:`, error);
        await db.collection<SessionMetadata>('sessions_metadata').updateOne(
            { sessionId: webhookSessionId }, 
            { $set: { status: 'error_scoring', updatedAt: new Date() } }
        );
      });
      return NextResponse.json({ message: 'Webhook received, scoring triggered.' }, { status: 200 });
    } else {
      console.log(`Call for session ${webhookSessionId} ended with reason: ${endReason} / status: ${callStatus}. Scoring not triggered.`);
      await db.collection<SessionMetadata>('sessions_metadata').updateOne(
        { sessionId: webhookSessionId }, 
        { $set: { status: 'webhook_received_not_scored', "payload.webhook_end_reason": endReason, updatedAt: new Date() } }
      );
      return NextResponse.json({ message: 'Webhook received, scoring not applicable for this event.' }, { status: 200 });
    }
  } catch (error) {
    console.error('Error processing webhook payload:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
} 