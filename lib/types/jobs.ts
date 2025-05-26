import { ObjectId } from 'mongodb';

export type ScoringJobStatus =
  | 'pending'       // Job is new, waiting to be processed
  | 'processing'    // A worker has picked up the job
  | 'completed'     // Scoring was successful (score saved)
  | 'failed'        // Scoring failed after retries by the worker
  | 'archived';     // Optional: for jobs that are processed and moved/marked (e.g., after results are confirmed)

export interface ScoringJob {
  _id?: ObjectId;
  sessionId: string;          
  rubricId: string;           // Storing as string, worker will convert to ObjectId
  rubricName?: string;        
  status: ScoringJobStatus;
  status_error?: string | null; 
  attempts: number;           
  max_attempts?: number;      
  created_at: Date;
  updated_at: Date;           
  processed_at?: Date;        
  worker_id?: string;         
} 