import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

// Define the structure of a Transcript Entry
interface TranscriptEntry {
  _id?: ObjectId;
  sessionId: string;
  role: 'interviewer' | 'candidate' | 'system'; // Added 'system' for potential system messages
  content: string;
  timestamp: Date; // Timestamp of when the utterance occurred
  createdAt?: Date; // Timestamp of when the record was created in DB
}

// POST handler to save a new transcript entry
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, role, content, timestamp } = body as Partial<TranscriptEntry>; // Using Partial for flexibility initially

    // Validate required fields
    if (!sessionId || !role || !content) {
      return NextResponse.json({ error: 'Missing required fields: sessionId, role, content' }, { status: 400 });
    }

    // Validate role
    const validRoles = ['interviewer', 'candidate', 'system'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: `Invalid role: ${role}. Must be one of ${validRoles.join(', ')}` }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const newTranscriptEntry: Omit<TranscriptEntry, '_id' | 'createdAt'> & { createdAt: Date } = {
      sessionId,
      role,
      content,
      timestamp: timestamp ? new Date(timestamp) : new Date(), // Use provided timestamp or current time
      createdAt: new Date(),
    };

    const result = await db.collection<TranscriptEntry>('transcripts').insertOne(newTranscriptEntry as TranscriptEntry);

    if (!result.insertedId) {
      return NextResponse.json({ error: 'Failed to save transcript entry' }, { status: 500 });
    }

    const createdEntry = await db.collection<TranscriptEntry>('transcripts').findOne({ _id: result.insertedId });

    return NextResponse.json({ message: 'Transcript entry saved successfully', transcript: createdEntry }, { status: 201 });
  } catch (error) {
    console.error('Failed to save transcript entry:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to save transcript entry' }, { status: 500 });
  }
}

// GET handler to fetch transcripts for a given sessionId
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId query parameter' }, { status: 400 });
  }

  try {
    const { db } = await connectToDatabase();
    const transcripts = await db.collection<TranscriptEntry>('transcripts')
      .find({ sessionId })
      .sort({ timestamp: 1 }) // Sort by timestamp ascending
      .toArray();
    
    return NextResponse.json({ transcripts }, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch transcripts for sessionId ${sessionId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch transcripts' }, { status: 500 });
  }
} 