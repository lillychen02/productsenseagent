import { NextRequest, NextResponse } from 'next/server';
// import { connectToDatabase } from '@/lib/mongodb'; // Remove native driver import
import connectMongoose from '@/lib/mongoose'; // Import Mongoose connect utility
import { ChatSessionModel } from '@/models/chatSession';
import { ChatSession } from '@/types'; // Import the ChatSession interface

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;
  // console.log(`[API GET /api/chat-sessions] Received request for sessionId: ${sessionId}`);

  if (!sessionId) {
    // console.log(`[API GET /api/chat-sessions] Error: Missing sessionId`);
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  try {
    // console.log(`[API GET /api/chat-sessions] Connecting Mongoose for ${sessionId}...`);
    await connectMongoose(); 
    // console.log(`[API GET /api/chat-sessions] Mongoose connected for ${sessionId}.`);

    // console.log(`[API GET /api/chat-sessions] Finding chat session for ${sessionId}...`);
    const chatSessionDoc = await ChatSessionModel.findOne({ sessionId }).lean<ChatSession>();
    
    if (!chatSessionDoc) {
    //   console.log(`[API GET /api/chat-sessions] Document NOT FOUND (null) for ${sessionId}.`);
    //   console.log(`[API GET /api/chat-sessions] No session found for ${sessionId}, returning empty messages.`);
      return NextResponse.json({ sessionId, messages: [] });
    }

    // console.log(`[API GET /api/chat-sessions] Document FOUND for ${sessionId}. Message count: ${chatSessionDoc.messages?.length || 0}`);
    // console.log(`[API GET /api/chat-sessions] Returning session data for ${sessionId}.`);
    
    return NextResponse.json({ 
        sessionId: chatSessionDoc.sessionId, 
        messages: chatSessionDoc.messages 
    });

  } catch (error) {
    // console.error(`[API GET /api/chat-sessions] Error fetching chat session for ${sessionId}:`, error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: 'Failed to fetch chat session', details: errorMessage }, { status: 500 });
  }
}
