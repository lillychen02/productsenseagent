import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb'; // Adjust path as needed
import { ObjectId } from 'mongodb';

// Assuming StoredScore and TranscriptEntry interfaces are defined elsewhere
// or we can redefine minimal versions here if not shared.
interface ScoreItem {
  dimension: string;
  score: number | null;
  feedback: {
    strengths: string[];
    weaknesses: string[];
  };
}
interface LLMScoreResponse {
  scores: ScoreItem[];
  overall_recommendation: string;
  summary_feedback?: string;
}
interface StoredScore {
  _id?: ObjectId;
  sessionId: string;
  rubricId: ObjectId;
  rubricName?: string;
  llmResponse: LLMScoreResponse;
  fullTranscriptText?: string; // This might be very large; consider if needed directly or fetch separately
  llmModelUsed?: string;
  scoredAt: Date;
}

interface TranscriptEntry {
  _id?: ObjectId;
  sessionId: string;
  role: 'interviewer' | 'candidate' | 'system';
  content: string;
  timestamp: Date;
  createdAt?: Date;
}

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId parameter' }, { status: 400 });
  }

  try {
    const { db } = await connectToDatabase();

    // 1. Fetch the score for the session
    // Assuming only one score document per session for simplicity here
    const scoreData = await db.collection<StoredScore>('scores').findOne({ sessionId });

    if (!scoreData) {
      return NextResponse.json({ error: 'Score not found for this session' }, { status: 404 });
    }

    // 2. Fetch all transcript entries for the session
    const transcripts = await db.collection<TranscriptEntry>('transcripts')
      .find({ sessionId })
      .sort({ timestamp: 1 })
      .toArray();

    // Format transcript into a simple text string for download
    const transcriptText = transcripts.map(t => `${t.role.toUpperCase()}: ${t.content}`).join('\n\n');

    // 3. Placeholder for Audio Download URL
    // In a real scenario, you'd generate a signed URL if audio is stored in S3, for example.
    const audioDownloadUrl = null; // Or a placeholder string: "/api/audio/download/" + sessionId;

    return NextResponse.json({
      scoreData,
      transcriptText,
      audioDownloadUrl,
    }, { status: 200 });

  } catch (error) {
    console.error(`Failed to fetch results for sessionId ${sessionId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
} 