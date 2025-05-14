import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb'; // Adjust path as needed
import { ObjectId } from 'mongodb';

// Updated to reflect potential new fields in Rubric for exemplar responses
interface ScoringDetail { '1': string; '2': string; '3': string; '4': string; }
interface RubricDimensionDefinition {
  dimension: string;
  description: string;
  subcriteria: string[];
  exemplar_response?: string | string[]; // Added
}
interface RoleVariantDetail { emphasized_dimensions: string[]; }
interface RoleVariants { [key: string]: RoleVariantDetail | undefined; }
interface RubricMetadata {
  role_variants?: RoleVariants;
  minimum_bar?: { required_dimensions: string[]; rule: string; };
}
interface RubricDefinition {
  scoring_scale: ScoringDetail;
  evaluation_criteria: RubricDimensionDefinition[];
  scoring_guide: { [key: string]: string; };
  metadata?: RubricMetadata;
}
interface FullRubric {
  _id?: ObjectId;
  name: string;
  definition: RubricDefinition;
  systemPrompt?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

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

    // 1. Fetch the LATEST score for the session
    const scoreData = await db.collection<StoredScore>('scores')
                            .find({ sessionId })
                            .sort({ scoredAt: -1 }) // Sort by scoredAt descending
                            .limit(1)               // Take the first one (latest)
                            .next();                // Use next() instead of toArray().findOne()

    if (!scoreData) {
      return NextResponse.json({ error: 'Score not found for this session' }, { status: 404 });
    }

    // Fetch the full rubric definition using rubricId from scoreData
    const rubric = await db.collection<FullRubric>('rubrics').findOne({ _id: new ObjectId(scoreData.rubricId) });
    if (!rubric) return NextResponse.json({ error: 'Rubric associated with the score not found' }, { status: 404 });

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
      rubricDefinition: rubric.definition, // Return the full rubric definition
      transcriptText,
      audioDownloadUrl,
    }, { status: 200 });

  } catch (error) {
    console.error(`Failed to fetch results for sessionId ${sessionId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
} 