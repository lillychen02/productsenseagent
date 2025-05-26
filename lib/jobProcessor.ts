import { connectToDatabase } from './mongodb';
import { ObjectId, Db as MongoDb } from 'mongodb';
import { logger } from './logger';
import { type ScoringJob, type ScoringJobStatus } from './types/jobs';
import { type SessionStatus, type SessionMetadata } from './types/session';
import { executeScoring, LLMProcessingError, DatabaseError } from './scoringService'; // Assuming StoredScore is implicitly handled or not needed as direct return here
import { sendDiscordAlert } from './monitoringUtils';

const MAX_JOB_PROCESSING_ATTEMPTS_FROM_CONFIG = process.env.MAX_JOB_ATTEMPTS ? parseInt(process.env.MAX_JOB_ATTEMPTS) : 3;
const PROCESSING_TIMEOUT_MS_FROM_CONFIG = process.env.SCORING_TIMEOUT_MS ? parseInt(process.env.SCORING_TIMEOUT_MS) : 55000;

async function updateSessionMetadataStatusInJobContext(sessionId: string, status: SessionStatus, db: MongoDb, error?: string | null) {
  // db instance is passed to avoid reconnecting if called within a transaction or existing connection
  try {
    const now = new Date();
    await db.collection<SessionMetadata>('sessions_metadata').updateOne(
      { sessionId }, 
      { $set: { status, status_updated_at: now, status_error: error === undefined ? null : error, updatedAt: now }}
    );
    logger.info({ event: 'JobProcessorSessionStatusUpdated', details: { sessionId, status, error: error || undefined } });
    if (status === 'scoring_failed_llm' || status === 'scoring_failed_db') {
      sendDiscordAlert(
        `Scoring Failed (Job): ${status.replace('scoring_failed_', '').toUpperCase()}`,
        `Scoring process failed for session ID: ${sessionId} via job.`, 
        [{ name: "Session ID", value: sessionId, inline: true }, { name: "Status", value: status, inline: true }, { name: "Error", value: error || 'N/A', inline: false }]
      );
    }
  } catch (dbError: any) {
    logger.error({ event: 'JobProcessorUpdateSessionStatusError', details: { sessionId, status, attemptedError: error }, error: { message: dbError.message } });
  }
}

export async function processOneScoringJob(): Promise<{ jobId?: string | ObjectId, sessionId?: string, status: string, message: string }> {
  logger.info({ event: 'ProcessOneScoringJobInvoked' });
  const { db } = await connectToDatabase();
  
  const job = await db.collection<ScoringJob>('scoring_jobs').findOneAndUpdate(
    {
      status: 'pending',
      attempts: { $lt: MAX_JOB_PROCESSING_ATTEMPTS_FROM_CONFIG } 
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
    logger.info({ event: 'ProcessOneScoringJobNoPendingJobs', message: 'No pending scoring jobs to process.' });
    return { status: 'no_jobs', message: 'No jobs to process' };
  }

  logger.info({ event: 'ProcessingScoringJob', details: { jobId: job._id, sessionId: job.sessionId, attempt: job.attempts } });

  try {
    const scoringPromise = executeScoring(job.sessionId, job.rubricId);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Scoring timed out after ${PROCESSING_TIMEOUT_MS_FROM_CONFIG / 1000}s`)), PROCESSING_TIMEOUT_MS_FROM_CONFIG)
    );
    
    await Promise.race([scoringPromise, timeoutPromise]);

    await updateSessionMetadataStatusInJobContext(job.sessionId, 'scored_successfully', db);
    await db.collection<ScoringJob>('scoring_jobs').updateOne(
      { _id: job._id },
      { $set: { status: 'completed', processed_at: new Date(), updatedAt: new Date(), status_error: null } }
    );
    logger.info({ event: 'ScoringJobCompleted', details: { jobId: job._id, sessionId: job.sessionId } });
    return { jobId: job._id, sessionId: job.sessionId, status: 'completed', message: `Job ${job._id?.toString()} completed successfully.` };

  } catch (err: any) {
    logger.error({ event: 'ScoringJobFailed', details: { jobId: job._id, sessionId: job.sessionId, attempt: job.attempts }, message: err.message, error: err });
    let sessionErrorStatus: SessionStatus = 'scoring_failed_db';
    if (err instanceof LLMProcessingError) {
      sessionErrorStatus = 'scoring_failed_llm';
    } else if (err.message && err.message.includes('Scoring timed out')){
      sessionErrorStatus = 'scoring_failed_llm'; 
    }

    await updateSessionMetadataStatusInJobContext(job.sessionId, sessionErrorStatus, db, err.message || 'Unknown scoring error');
    await db.collection<ScoringJob>('scoring_jobs').updateOne(
      { _id: job._id },
      { $set: { 
          status: 'failed',
          status_error: err.message || 'Unknown error', 
          processed_at: new Date(),
          updatedAt: new Date() 
        }}
    );
    return { jobId: job._id, sessionId: job.sessionId, status: 'failed', message: `Job ${job._id?.toString()} failed: ${err.message}` };
  }
} 