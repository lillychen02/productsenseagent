import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb'; // Adjust path based on actual location
import { logger } from '../../../../lib/logger'; // Adjust path
import { SessionMetadata } from '../../../../lib/types/session'; // Adjust path

export async function POST(request: NextRequest) {
  const baseLogPayload = {
    handler: 'POST /api/sessions/map-elevenlabs-id',
    requestBody: {},
  };

  try {
    let requestBody;
    try {
      requestBody = await request.json();
      baseLogPayload.requestBody = requestBody; // For logging the received body
    } catch (e) {
      logger.warn({ ...baseLogPayload, event: 'RequestBodyParseError', details: { error: (e as Error).message }, message: 'Failed to parse request body as JSON.' });
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { sessionId, elevenlabsConversationId } = requestBody as {
      sessionId?: string;
      elevenlabsConversationId?: string;
    };

    if (!sessionId || typeof sessionId !== 'string') {
      logger.warn({ ...baseLogPayload, event: 'InvalidSessionId', message: 'Missing or invalid sessionId.' });
      return NextResponse.json({ error: 'Missing or invalid sessionId' }, { status: 400 });
    }

    if (!elevenlabsConversationId || typeof elevenlabsConversationId !== 'string') {
      logger.warn({ ...baseLogPayload, event: 'InvalidElevenLabsId', details: { sessionId }, message: 'Missing or invalid elevenlabsConversationId.' });
      return NextResponse.json({ error: 'Missing or invalid elevenlabsConversationId' }, { status: 400 });
    }
    
    // Add sessionId to log payload for subsequent logs related to this specific request
    const currentLogPayload = { ...baseLogPayload, sessionId };

    const { db } = await connectToDatabase();
    const now = new Date();

    logger.info({ ...currentLogPayload, event: 'AttemptingToUpdateSession', details: { elevenlabsConversationId } , message: 'Attempting to map ElevenLabs ID to session.' });

    const result = await db.collection<SessionMetadata>('sessions_metadata').findOneAndUpdate(
      { sessionId: sessionId }, // Filter by our internal sessionId
      {
        $set: {
          elevenlabsConversationId: elevenlabsConversationId,
          updatedAt: now,
          status_updated_at: now, // Also update status_updated_at as this is a significant session event
        },
      },
      {
        returnDocument: 'after', // Optionally return the updated document
        upsert: false, // Do not create if not found
      }
    );

    if (!result) { // findOneAndUpdate returns null if no document matched the filter
      logger.warn({ ...currentLogPayload, event: 'SessionNotFoundForMapping', details: { elevenlabsConversationId }, message: 'Session metadata not found for the provided sessionId.' });
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    logger.info({ ...currentLogPayload, event: 'SessionUpdateSuccessForMapping', details: { elevenlabsConversationId, updatedDocument: result }, message: 'Successfully mapped ElevenLabs ID to session.' });

    return NextResponse.json({ message: 'ElevenLabs ID mapped successfully', session: result }, { status: 200 });

  } catch (error: any) {
    logger.error({ ...baseLogPayload, event: 'UnhandledError', details: { errorMessage: error.message, stack: error.stack, errorObject: error }, message: 'An unexpected error occurred while mapping ElevenLabs ID.' });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 