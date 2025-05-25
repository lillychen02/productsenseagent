import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb'; // Adjust path as needed
import { ObjectId } from 'mongodb';
import { type SessionStatus } from '../../../../lib/types/session'; // Corrected import path

// Simplified SessionMetadata for this endpoint's response
interface SessionStatusResponse {
  sessionId: string;
  status: SessionStatus;
  status_updated_at: Date;
  status_error?: string | null;
  // Include rubricName and interviewType as they might be useful for context on frontend
  rubricName?: string;
  interviewType?: string;
}

interface SessionMetadataDbModel { // What's actually in the DB
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
  }

export async function GET(
  request: NextRequest,
  context: { params: { sessionId: string } }
) {
  const sessionId = context.params.sessionId;

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  try {
    const { db } = await connectToDatabase();
    const sessionMetadata = await db.collection<SessionMetadataDbModel>('sessions_metadata').findOne({ sessionId });

    if (!sessionMetadata) {
      return NextResponse.json({ error: 'Session metadata not found' }, { status: 404 });
    }

    const responseData: SessionStatusResponse = {
      sessionId: sessionMetadata.sessionId,
      status: sessionMetadata.status,
      status_updated_at: sessionMetadata.status_updated_at,
      status_error: sessionMetadata.status_error,
      rubricName: sessionMetadata.rubricName,
      interviewType: sessionMetadata.interviewType,
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error(`Error fetching session status for ${sessionId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch session status' }, { status: 500 });
  }
} 