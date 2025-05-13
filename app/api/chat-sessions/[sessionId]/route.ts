import { NextRequest, NextResponse } from 'next/server';
// import { connectToDatabase } from '@/lib/mongodb'; // Remove native driver import
import connectMongoose from '@/lib/mongoose'; // Import Mongoose connect utility
import { ChatSessionModel } from '@/models/chatSession';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;
  console.log(`[API GET /api/chat-sessions] Received request for sessionId: ${sessionId}`);

  if (!sessionId) {
    console.log(`[API GET /api/chat-sessions] Error: Missing sessionId`);
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  try {
    console.log(`[API GET /api/chat-sessions] Connecting Mongoose for ${sessionId}...`);
    await connectMongoose(); // Ensure Mongoose connection is ready
    console.log(`[API GET /api/chat-sessions] Mongoose connected for ${sessionId}.`);

    console.log(`[API GET /api/chat-sessions] Finding chat session for ${sessionId}...`);
    const chatSession = await ChatSessionModel.findOne({ sessionId }).lean(); // Use .lean() for plain JS objects
    console.log(`[API GET /api/chat-sessions] Found session for ${sessionId}: ${chatSession ? 'Yes' : 'No'}`);

    if (!chatSession) {
      console.log(`[API GET /api/chat-sessions] No session found for ${sessionId}, returning empty messages.`);
      // If no session found, return the expected structure with empty messages
      return NextResponse.json({ sessionId, messages: [] });
    }

    console.log(`[API GET /api/chat-sessions] Returning session data for ${sessionId}.`);
    // Return the found session data (implicitly contains messages)
    // Ensure the response structure matches the frontend expectations
    return NextResponse.json({ 
        sessionId: chatSession.sessionId,
        messages: chatSession.messages 
    });

  } catch (error) {
    console.error(`[API GET /api/chat-sessions] Error fetching chat session for ${sessionId}:`, error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: 'Failed to fetch chat session', details: errorMessage }, { status: 500 });
  }
} 