import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import OpenAI from 'openai';
import { type SessionStatus, type SessionMetadata } from '../../../lib/types/session';
import { sendDiscordAlert } from '../../../lib/monitoringUtils';
import { logger } from '../../../lib/logger';
import { executeScoring, LLMProcessingError, DatabaseError, StoredScore } from '../../../lib/scoringService';

async function updateSessionStatus(sessionId: string, status: SessionStatus, error?: string | null) {
  try {
    const { db } = await connectToDatabase();
    const now = new Date();
    await db.collection<SessionMetadata>('sessions_metadata').updateOne(
      { sessionId }, 
      { $set: { status: status, status_updated_at: now, status_error: error === undefined ? null : error, updatedAt: now }}
    );
    logger.info({ event: 'SessionStatusUpdated', details: { sessionId, status, error: error || undefined } });
    if (status === 'scoring_failed_llm' || status === 'scoring_failed_db') {
      sendDiscordAlert(
        `Scoring Failed: ${status.replace('scoring_failed_', '').toUpperCase()}`,
        `Scoring process failed for session ID: ${sessionId}.`, 
        [{ name: "Session ID", value: sessionId, inline: true }, { name: "Status", value: status, inline: true }, { name: "Error", value: error || 'N/A', inline: false }]
      );
      logger.info({event: 'DiscordAlertSentForScoringFailure', details: { sessionId, status, error }});
    }
  } catch (dbError: any) {
    logger.error({ event: 'UpdateSessionStatusError', details: { sessionId, status, attemptedError: error }, error: { message: dbError.message, stack: dbError.stack } });
  }
}

export async function POST(request: Request) {
  let sessionId: string | undefined;
  let rubricId: string | undefined;

  try {
    const body = await request.json();
    sessionId = body.sessionId as string;
    rubricId = body.rubricId as string;

    if (!process.env.OPENAI_API_KEY) {
      logger.error({event: 'OpenAIKeyMissing', message: 'OPENAI_API_KEY is not configured.'});
      return NextResponse.json({ error: 'Server configuration error: Missing OpenAI API key.' }, { status: 500 });
    }
    if (!sessionId || !rubricId) {
      logger.warn({ event: 'ScoreSessionInputValidation', message: 'Missing sessionId or rubricId', details: { sessionId, rubricId } });
      return NextResponse.json({ error: 'Missing sessionId or rubricId' }, { status: 400 });
    }
    
    logger.info({event: 'ScoreSessionRequestReceived', details: { sessionId, rubricId }});
    await updateSessionStatus(sessionId, 'scoring_in_progress');

    const createdScore: StoredScore = await executeScoring(sessionId, rubricId);
    
    await updateSessionStatus(sessionId, 'scored_successfully');
    logger.info({ event: 'ScoreSessionSuccess', details: { sessionId, scoreId: createdScore._id } });
    return NextResponse.json({ message: 'Session scored successfully', score: createdScore }, { status: 201 });

  } catch (error: any) {
    const finalSessionId = sessionId || 'unknown_session';
    let failureStatus: SessionStatus = 'scoring_failed_db';
    let errorMessage = 'Failed to score session due to an unexpected error';

    if (error instanceof LLMProcessingError) {
      failureStatus = 'scoring_failed_llm';
      errorMessage = error.message || 'LLM processing failed';
      logger.error({ event: 'ScoreSessionLLMError', details: { sessionId: finalSessionId }, message: errorMessage, error });
    } else if (error instanceof DatabaseError) {
      failureStatus = 'scoring_failed_db';
      errorMessage = error.message || 'Database operation failed during scoring';
      logger.error({ event: 'ScoreSessionDBError', details: { sessionId: finalSessionId }, message: errorMessage, error });
    } else if (error instanceof SyntaxError) {
        errorMessage = 'Invalid JSON in request body';
        logger.warn({ event: 'ScoreSessionInputError', message: errorMessage, error });
        return NextResponse.json({ error: errorMessage }, { status: 400 });
    } else {
      logger.error({event: 'ScoreSessionUnhandledError', details: { sessionId: finalSessionId }, message: error.message || errorMessage, error: error});
    }

    if (sessionId) {
        await updateSessionStatus(finalSessionId as string, failureStatus, errorMessage);
    }
    
    const httpStatus = (error instanceof OpenAI.APIError && error.status) ? error.status : 500;
    return NextResponse.json({ error: errorMessage }, { status: httpStatus });
  }
} 