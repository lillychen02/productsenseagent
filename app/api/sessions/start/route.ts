import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb'; // Adjust path as needed
import { ObjectId } from 'mongodb';

interface SessionMetadata {
  _id?: ObjectId;
  sessionId: string;
  rubricId: ObjectId;
  rubricName?: string; 
  interviewType?: string;
  startTime: Date;
  status: 'started' | 'webhook_received' | 'scoring_triggered' | 'scored' | 'error_scoring' | 'error_webhook';
  updatedAt: Date;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, rubricId, rubricName, interviewType } = body as 
      { sessionId: string; rubricId: string; rubricName?: string; interviewType?: string };

    if (!sessionId || !rubricId) {
      return NextResponse.json({ error: 'Missing sessionId or rubricId' }, { status: 400 });
    }

    let mongoRubricId;
    try {
      mongoRubricId = new ObjectId(rubricId);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid rubricId format' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const newSessionMetadata: Omit<SessionMetadata, '_id'> = {
      sessionId,
      rubricId: mongoRubricId,
      rubricName: rubricName || 'N/A',
      interviewType: interviewType || 'N/A',
      startTime: new Date(),
      status: 'started',
      updatedAt: new Date(),
    };

    // Optional: Check if a session with this sessionId already exists to prevent duplicates
    // const existingSession = await db.collection<SessionMetadata>('sessions_metadata').findOne({ sessionId });
    // if (existingSession) {
    //   console.warn(`Session metadata for sessionId ${sessionId} already exists. Updating status or ignoring.`);
    //   // Potentially update status or just return existing, depending on desired logic
    //   return NextResponse.json({ message: 'Session metadata already exists', session: existingSession }, { status: 200 });
    // }

    const result = await db.collection<SessionMetadata>('sessions_metadata').insertOne(newSessionMetadata as SessionMetadata);

    if (!result.insertedId) {
      return NextResponse.json({ error: 'Failed to save session metadata' }, { status: 500 });
    }

    const createdSessionMetadata = await db.collection<SessionMetadata>('sessions_metadata').findOne({ _id: result.insertedId });

    return NextResponse.json({ message: 'Session metadata saved successfully', sessionMetadata: createdSessionMetadata }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/sessions/start:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to save session metadata' }, { status: 500 });
  }
} 