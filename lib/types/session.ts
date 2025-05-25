import { ObjectId } from 'mongodb'; // ObjectId will be used here

export type SessionStatus = 
  | 'started'
  | 'webhook_received' 
  | 'scoring_enqueued'
  | 'scoring_enqueue_failed'
  | 'scoring_in_progress'
  | 'scoring_failed_llm'
  | 'scoring_failed_db'
  | 'scored_successfully'
  | 'webhook_received_not_scored';

export interface EmailedResultLogEntry {
  email: string;
  timestamp: Date;
  resendMessageId?: string; // Optional: if you want to store this from Resend response
}

export interface SessionMetadata {
  _id?: ObjectId;
  sessionId: string;
  rubricId: ObjectId; 
  rubricName?: string; 
  interviewType?: string;
  startTime: Date;
  status: SessionStatus; 
  status_updated_at: Date; 
  status_error?: string | null; 
  queue_job_id?: string | null; 
  updatedAt: Date; 
  payload?: { 
    webhook_call_status?: string;
    webhook_end_reason?: string;
  };
  emailedResultsTo?: EmailedResultLogEntry[];
} 