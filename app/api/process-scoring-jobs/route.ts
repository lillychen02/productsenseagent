import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { logger } from '../../../lib/logger';
import { type ScoringJob, type ScoringJobStatus } from '../../../lib/types/jobs';
import { type SessionStatus, type SessionMetadata } from '../../../lib/types/session';
import { executeScoring, LLMProcessingError, DatabaseError, StoredScore } from '../../../lib/scoringService';
import { sendDiscordAlert } from '../../../lib/monitoringUtils';

const MAX_JOB_PROCESSING_ATTEMPTS = 3; // Default max attempts for a job if not set on job itself
const PROCESSING_TIMEOUT_MS = 55000; // Time limit for processing a single job (e.g., 55s for Vercel Pro 60s limit)

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
  logger.info({ event: 'ProcessScoringJobsStarted' });
  const { db } = await connectToDatabase();
  let jobProcessed = false;

  const job = await db.collection<ScoringJob>('scoring_jobs').findOneAndUpdate(
    {
      status: 'pending',
      attempts: { $lt: MAX_JOB_PROCESSING_ATTEMPTS }
    },
    {
      $set: { status: 'processing', updatedAt: new Date() },
      $inc: { attempts: 1 }
    },
    {
      sort: { created_at: 1 },
      returnDocument: 'after'
    }
  );

  if (!job) {
    logger.info({ event: 'ProcessScoringJobsNoPendingJobs', message: 'No pending scoring jobs to process.' });
    return NextResponse.json({ message: 'No jobs to process' }, { status: 200 });
  }

  logger.info({ event: 'ProcessingScoringJob', details: { jobId: job._id, sessionId: job.sessionId, attempt: job.attempts } });

  try {
    const scoringPromise = executeScoring(job.sessionId, job.rubricId);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Scoring timed out after ${PROCESSING_TIMEOUT_MS / 1000}s`)), PROCESSING_TIMEOUT_MS)
    );
    
    await Promise.race([scoringPromise, timeoutPromise]);

    await updateSessionMetadataStatus(job.sessionId, 'scored_successfully');
    await db.collection<ScoringJob>('scoring_jobs').updateOne(
      { _id: job._id },
      { $set: { status: 'completed', processed_at: new Date(), updatedAt: new Date(), status_error: null } }
    );
    logger.info({ event: 'ScoringJobCompleted', details: { jobId: job._id, sessionId: job.sessionId } });
    jobProcessed = true;

  } catch (err: any) {
    logger.error({ event: 'ScoringJobFailed', details: { jobId: job._id, sessionId: job.sessionId, attempt: job.attempts }, message: err.message, error: err });
    let jobErrorStatus: ScoringJobStatus = 'failed';
    let sessionErrorStatus: SessionStatus = 'scoring_failed_db';

    if (err instanceof LLMProcessingError) {
      sessionErrorStatus = 'scoring_failed_llm';
    } else if (err.message && err.message.includes('Scoring timed out')){
      sessionErrorStatus = 'scoring_failed_llm';
    }

    await updateSessionMetadataStatus(job.sessionId, sessionErrorStatus, err.message || 'Unknown scoring error');
    await db.collection<ScoringJob>('scoring_jobs').updateOne(
      { _id: job._id },
      { $set: { 
          status: jobErrorStatus,
          status_error: err.message || 'Unknown error', 
          processed_at: new Date(),
          updatedAt: new Date() 
        }}
    );
    jobProcessed = true;
  }

  return NextResponse.json({ message: jobProcessed ? `Processed job ${job._id} for session ${job.sessionId}` : 'Job processing initiated, check logs.' }, { status: 200 });
} 