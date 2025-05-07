import { NextResponse } from 'next/server';

// This would typically connect to a database in a real implementation
const transcripts: Array<{
  sessionId: string;
  timestamp: string;
  role: string;
  content: string;
}> = [];

export async function POST(request: Request) {
  console.log('Transcript API called');
  try {
    const body = await request.json();
    console.log('Received transcript data:', body);
    
    const { sessionId, role, content } = body;

    if (!sessionId || !role || !content) {
      console.error('Missing required fields in transcript data');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Add transcript to the in-memory array (would be a database in production)
    const timestamp = new Date().toISOString();
    transcripts.push({
      sessionId,
      timestamp,
      role,
      content
    });

    // Log for demonstration purposes
    console.log(`[Transcript] ${role}: ${content}`);
    console.log(`Total transcripts: ${transcripts.length}`);

    return NextResponse.json({
      success: true,
      transcriptCount: transcripts.length
    });
  } catch (error) {
    console.error('Error saving transcript:', error);
    return NextResponse.json(
      { error: 'Failed to save transcript' },
      { status: 500 }
    );
  }
}

// For development/debugging - get all transcripts
export async function GET() {
  console.log('GET /api/transcripts called. Current transcripts:', transcripts.length);
  return NextResponse.json({ transcripts });
} 