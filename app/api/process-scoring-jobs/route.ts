import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { logger } from '../../../lib/logger';
import { type ScoringJob, type ScoringJobStatus } from '../../../lib/types/jobs';
import { type SessionStatus, type SessionMetadata } from '../../../lib/types/session';
import { executeScoring, LLMProcessingError, DatabaseError, StoredScore } from '../../../lib/scoringService';
import { sendDiscordAlert } from '../../../lib/monitoringUtils';
import { processOneScoringJob } from '../../../lib/jobProcessor'; // Import the core processing logic

const MAX_JOB_PROCESSING_ATTEMPTS = 3; // Default max attempts for a job if not set on job itself
const PROCESSING_TIMEOUT_MS = 55000; // Time limit for processing a single job (e.g., 55s for Vercel Pro 60s limit)
const CRON_SECRET_EXPECTED = process.env.CRON_SECRET;

async function updateSessionMetadataStatus(sessionId: string, status: SessionStatus, error?: string | null) {
  // This is similar to the helper in /api/score-session, consider centralizing if identical
  // For now, keeping it local to this worker's context for clarity
  try {
    const { db } = await connectToDatabase();
    const now = new Date();
    await db.collection<SessionMetadata>('sessions_metadata').updateOne(
      { sessionId }, 
      { $set: { status, status_updated_at: now, status_error: error === undefined ? null : error, updatedAt: now }}
    );
    logger.info({ event: 'WorkerSessionStatusUpdated', details: { sessionId, status, error: error || undefined } });
    // Alerting for final failure states of a session, triggered by the job worker
    if (status === 'scoring_failed_llm' || status === 'scoring_failed_db') {
      sendDiscordAlert(
        `Scoring Failed (Job Worker): ${status.replace('scoring_failed_', '').toUpperCase()}`,
        `Scoring process failed for session ID: ${sessionId} via job worker.`, 
        [{ name: "Session ID", value: sessionId, inline: true }, { name: "Status", value: status, inline: true }, { name: "Error", value: error || 'N/A', inline: false }]
      );
    }
  } catch (dbError: any) {
    logger.error({ event: 'WorkerUpdateSessionStatusError', details: { sessionId, status, attemptedError: error }, error: { message: dbError.message } });
  }
}

// This endpoint will be triggered by a Vercel Cron Job
export async function GET(request: NextRequest) {
  // 1. Authorize Cron Job Request
  if (!CRON_SECRET_EXPECTED) {
    logger.error({ 
      event: 'CronJobAuthError', 
      message: 'CRON_SECRET is not configured on the server for /api/process-scoring-jobs.' 
    });
    return new NextResponse('Configuration error: Cron secret not set on server.', { status: 500 }); 
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET_EXPECTED}`) {
    logger.warn({ 
      event: 'CronJobUnauthorized', 
      message: 'Unauthorized attempt to access /api/process-scoring-jobs.',
      details: { receivedHeader: authHeader || "Not provided" }
    });
    return new NextResponse('Unauthorized', { status: 401 });
  }

  logger.info({ event: 'CronJobProcessScoringInvoked', details: { authorized: true } });

  try {
    const result = await processOneScoringJob(); // Call the centralized job processing logic
    
    if (result.status === 'no_jobs') {
      logger.info({event: 'CronJobNoPendingJobs', message: result.message});
      return NextResponse.json({ message: result.message }, { status: 200 });
    } else if (result.status === 'completed') {
      logger.info({event: 'CronJobProcessedSuccessfully', details: { jobId: result.jobId, sessionId: result.sessionId, message: result.message }});
      return NextResponse.json({ message: result.message, jobId: result.jobId, sessionId: result.sessionId }, { status: 200 });
    } else if (result.status === 'failed') {
      logger.warn({event: 'CronJobProcessedWithFailure', details: { jobId: result.jobId, sessionId: result.sessionId, message: result.message }});
      // The error details would have been logged and alerted from within processOneScoringJob/executeScoring
      return NextResponse.json({ message: result.message, jobId: result.jobId, sessionId: result.sessionId }, { status: 200 }); // Still 200, cron did its job of attempting
    } else {
      // Should not happen if processOneScoringJob returns defined statuses
      logger.error({event: 'CronJobUnknownResultStatus', details: { result } });
      return NextResponse.json({ message: "Job processing resulted in an unknown state.", result }, { status: 500 });
    }

  } catch (error: any) {
    logger.error({ 
      event: 'CronJobProcessScoringCriticalError', 
      message: 'Critical unhandled error in /api/process-scoring-jobs.', 
      error: { message: error.message, stack: error.stack }
    });
    // This is an error in the worker API itself, not necessarily a job processing failure
    return NextResponse.json({ error: 'Failed to process scoring jobs due to an unexpected server error.' }, { status: 500 });
  }
} 