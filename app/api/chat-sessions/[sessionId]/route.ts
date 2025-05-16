import { NextRequest, NextResponse } from 'next/server';
// import { connectToDatabase } from '@/lib/mongodb'; // Remove native driver import
import connectMongoose from '@/lib/mongoose'; // Import Mongoose connect utility
import { ChatSessionModel } from '@/models/chatSession';
import { ChatSession } from '@/types'; // Import the ChatSession interface

export async function GET(
  request: NextRequest,
  context: any // Let TypeScript infer, or use 'any' if strict mode requires some type
) {
  // Assuming TS infers context correctly, or context.params will be checked at runtime
  const sessionId = context.params?.sessionId; // Optional chaining for safety if params might be undefined

  if (!sessionId) {
    // console.error('[API /api/chat-sessions/[sessionId]] Error: Missing sessionId in params.'); // Re-commenting for brevity now
    return NextResponse.json({ error: 'Session ID is required or context.params is not structured as expected.' }, { status: 400 });
  }

  try {
    // console.log(`[API GET /api/chat-sessions] Connecting Mongoose for ${sessionId}...`);
    await connectMongoose(); 
    // console.log(`[API GET /api/chat-sessions] Mongoose connected for ${sessionId}.`);

    // console.log(`[API GET /api/chat-sessions] Finding chat session for ${sessionId}...`);
    const chatSessionDoc = await ChatSessionModel.findOne({ sessionId }).lean<ChatSession>();
    
    if (!chatSessionDoc) {
      // console.log(`[API /api/chat-sessions/[sessionId]] No chat session found for sessionId: ${sessionId}, returning empty messages.`);
      return NextResponse.json({ sessionId, messages: [] });
    }

    // console.log(`[API GET /api/chat-sessions] Document FOUND for ${sessionId}. Message count: ${chatSessionDoc.messages?.length || 0}`);
    // console.log(`[API GET /api/chat-sessions] Returning session data for ${sessionId}.`);
    
    return NextResponse.json({ 
        sessionId: chatSessionDoc.sessionId, 
        messages: chatSessionDoc.messages 
    });

  } catch (error) {
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    console.error(`[API /api/chat-sessions/[sessionId]] Error fetching chat session for ${sessionId}:`, error); // Keep this error log
    return NextResponse.json({ error: 'Failed to fetch chat session', details: errorMessage }, { status: 500 });
  }
}
