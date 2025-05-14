import { NextRequest, NextResponse } from 'next/server';
// import { connectToDatabase } from '@/lib/mongodb'; // Remove native driver import
import connectMongoose from '@/lib/mongoose'; // Import Mongoose connect utility
import mongoose from 'mongoose'; // Import mongoose itself
import { ChatSessionModel } from '@/models/chatSession';
import { ScoreModel } from '@/models/score'; // Import ScoreModel
import { RubricModel } from '@/models/rubric'; // Import RubricModel
import { ChatMessage, StoredScore, Rubric } from '@/types'; // Import necessary types
import OpenAI from 'openai';
// ObjectId no longer needed here if using Mongoose models for all fetches

// Initialize OpenAI client (ensure OPENAI_API_KEY is set)
if (!process.env.OPENAI_API_KEY) {
  console.error('FATAL ERROR: OPENAI_API_KEY is not defined.');
}
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Updated helper function to format context for the LLM
function formatContextForLLM(scoreData: StoredScore | null, rubric: Rubric | null): string {
  if (!scoreData || !rubric) {
    return "No specific interview context is available for this session.";
  }

  const { llmResponse, fullTranscriptText } = scoreData;

  const scoresFormatted = llmResponse.scores.map(item => {
    const strengths = item.feedback.strengths?.length
      ? `  Strengths: ${item.feedback.strengths.join(', ')}\n`
      : '';
    const weaknesses = item.feedback.weaknesses?.length
      ? `  Weaknesses: ${item.feedback.weaknesses.join(', ')}\n`
      : '';
    return `- ${item.dimension}: ${item.score}/4\n${strengths}${weaknesses}`;
  }).join('\n');

  // Updated rubric formatting to be more structured and robust
  let rubricFormatted = `Rubric Name: ${rubric.name}\n`;
  rubricFormatted += "Evaluation Criteria:\n";
  rubric.definition.evaluation_criteria.forEach(criterion => {
    rubricFormatted += `  - Dimension: ${criterion.dimension}\n`;
    rubricFormatted += `    Description: ${criterion.description}\n`;
    if (criterion.subcriteria?.length) {
      rubricFormatted += `    Subcriteria: ${criterion.subcriteria.join(', ')}\n`;
    }
  });
  // Optionally, add more details from rubric.definition.scoring_scale or rubric.definition.scoring_guide
  // For brevity, this example focuses on evaluation_criteria.

  return `
📊 **Scores**
${scoresFormatted}
- Overall Recommendation: ${llmResponse.overall_recommendation}

📝 **Rubric Summary**
${rubricFormatted}

💬 **Coach Feedback**
${llmResponse.summary_feedback || 'No written feedback provided.'}

🗣 **Transcript**
${fullTranscriptText || 'Transcript not available.'}
  `.trim();
}

export async function POST(request: NextRequest) {
  let sessionId: string = 'unknown'; // Default for logging if parsing fails
  let userMessageContent: string = 'unknown';

  try {
    console.log('[API POST /api/ask-loopie] Received request');
    const body = await request.json();
    sessionId = body.sessionId;
    userMessageContent = body.message;
    console.log(`[API POST /api/ask-loopie] Parsed request for sessionId: ${sessionId}`);

    if (!sessionId || !userMessageContent) {
       console.log(`[API POST /api/ask-loopie] Error: Missing sessionId or message content for ${sessionId}`);
      return NextResponse.json({ error: 'Missing sessionId or message content' }, { status: 400 });
    }
  } catch (e) {
    console.error('[API POST /api/ask-loopie] Error parsing request body:', e);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    console.log(`[API POST /api/ask-loopie] Connecting Mongoose for ${sessionId}...`);
    await connectMongoose(); 
    console.log(`[API POST /api/ask-loopie] Mongoose connected for ${sessionId}.`);
    
    // Log Mongoose connection state robustly
    if (mongoose.connection && mongoose.connection.db) {
      console.log("[API POST /api/ask-loopie] Mongoose connection DB name:", mongoose.connection.db.databaseName);
    } else {
      console.log("[API POST /api/ask-loopie] Mongoose connection DB object not available.");
    }
    console.log("[API POST /api/ask-loopie] Mongoose connection readyState:", mongoose.connection.readyState);

    // --- Fetch LATEST Interview Context using Mongoose Models --- 
    console.log(`[API POST /api/ask-loopie] Fetching latest score data for ${sessionId}...`);
    const scoreData = await ScoreModel.findOne({ sessionId })
                                  .sort({ scoredAt: -1 }) // Sort by scoredAt descending
                                  .lean<StoredScore>();    // Get the latest one
    console.log(`[API POST /api/ask-loopie] Score data found for ${sessionId}: ${scoreData ? 'Yes' : 'No'}`);
    
    let rubric: Rubric | null = null;
    if (scoreData?.rubricId) {
        console.log(`[API POST /api/ask-loopie] Fetching rubric (ID: ${scoreData.rubricId}) for ${sessionId}...`);
        rubric = await RubricModel.findById(scoreData.rubricId).lean<Rubric>(); 
        console.log(`[API POST /api/ask-loopie] Rubric found for ${sessionId}: ${rubric ? 'Yes' : 'No'}`);
    }
    if (!scoreData) { console.warn(`[API POST /api/ask-loopie] No score data for ${sessionId}.`); }
    if (scoreData && !rubric) { console.warn(`[API POST /api/ask-loopie] No rubric found for ${sessionId} (Rubric ID: ${scoreData.rubricId})`); }

    // --- Fetch or Create Chat Session --- 
    console.log(`[API POST /api/ask-loopie] Fetching chat session for ${sessionId}...`);
    let chatSession = await ChatSessionModel.findOne({ sessionId });
    console.log(`[API POST /api/ask-loopie] Existing chat session found for ${sessionId}: ${chatSession ? 'Yes' : 'No'}`);

    const userMessage: ChatMessage = {
      role: 'user',
      content: userMessageContent,
      timestamp: new Date()
    };

    // --- Prepare messages for LLM (UPDATED system prompt) --- 
    const interviewContext = formatContextForLLM(scoreData, rubric);
    const systemPrompt = `You are Loopie, a warm and insightful product sense coach.

A candidate just completed a product sense interview. You have access to the prompt, transcript, rubric, scores, and coach-written feedback.

Your job is to help them improve by offering *clear, thoughtful, and actionable coaching*. You may organize your answer however you like — use headings, bullets, or narrative style, as long as it's warm, specific, and helpful.

Start by highlighting 1–2 things they did well, then explain what could be stronger. Ground your advice in the actual interview context — don't generalize.

Always assume positive intent. Be sharp, kind, and surgical.

INTERVIEW CONTEXT:
${interviewContext}
`;
    console.log("------------------- FULL SYSTEM PROMPT FOR LLM (after embedding context) -------------------");
    console.log(systemPrompt);
    console.log("--------------------------------------------------------------------------------------------");
    
    // Initial assistant message for tone setting (only if no prior messages)
    const initialAssistantMessageForLLM = {
      role: 'assistant' as const, 
      content: "Hey there! I'm Loopie 😊 I'm here to help you grow from this interview. Ask me anything about how you did — I'm here to support you with clear, honest feedback."
    };

    const messagesForLLM = [
        { role: 'system', content: systemPrompt },
        ...((!chatSession || chatSession.messages.length === 0) ? [initialAssistantMessageForLLM] : []),
        ...(chatSession?.messages.map((msg: ChatMessage) => ({ role: msg.role, content: msg.content })) || []),
        { role: userMessage.role, content: userMessage.content }
    ];
    console.log("------------------- MESSAGES ARRAY SENT TO LLM (messagesForLLM) ----------------------");
    // Using JSON.stringify to see the array structure and content clearly.
    // Be mindful if context is extremely long, this log could be huge.
    console.log(JSON.stringify(messagesForLLM, null, 2)); 
    console.log("----------------------------------------------------------------------------------------");
    console.log(`[API POST /api/ask-loopie] Prepared ${messagesForLLM.length} messages for LLM call for ${sessionId}.`);

    // --- Call LLM --- 
    console.log(`[API POST /api/ask-loopie] Calling OpenAI for ${sessionId}...`);
    const llmModel = 'chatgpt-4o-latest';
    let assistantResponseContent = 'Sorry, I encountered an error trying to respond.';
    let llmChoice;

    try {
      const completion = await openai.chat.completions.create({
        model: llmModel,
        messages: messagesForLLM as any,
        temperature: 0.7,
      });
      llmChoice = completion.choices[0];
      assistantResponseContent = llmChoice?.message?.content || assistantResponseContent;
      console.log(`[API POST /api/ask-loopie] OpenAI call successful for ${sessionId}. Finish reason: ${llmChoice?.finish_reason}`);
    } catch (llmError) {
      console.error(`[API POST /api/ask-loopie] LLM call FAILED for ${sessionId}:`, llmError);
      if (llmError instanceof OpenAI.APIError) {
           assistantResponseContent = `Sorry, there was an issue with the AI service (Status: ${llmError.status}). Please try again later.`;
      }
       // Keep default error message for other errors
    }

    const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: assistantResponseContent,
        timestamp: new Date()
    };

    // --- Store Messages --- 
    console.log(`[API POST /api/ask-loopie] Storing messages for ${sessionId}...`);
    try {
        if (!chatSession) {
          console.log(`[API POST /api/ask-loopie] Creating new chat session document for ${sessionId}.`);
          chatSession = new ChatSessionModel({
            sessionId,
            messages: [userMessage, assistantMessage]
          });
        } else {
          console.log(`[API POST /api/ask-loopie] Pushing messages to existing session for ${sessionId}.`);
          chatSession.messages.push(userMessage, assistantMessage);
          chatSession.markModified('messages');
        }
        await chatSession.save();
        console.log(`[API POST /api/ask-loopie] Messages stored successfully for ${sessionId}.`);
    } catch (dbError) {
        console.error(`[API POST /api/ask-loopie] FAILED to save chat session for ${sessionId}:`, dbError);
        // Even if saving fails, we might still return the assistant message to the user
        // Or you could throw and let the outer catch handle it:
        // throw dbError;
    }

    // --- Return Assistant's Reply --- 
    console.log(`[API POST /api/ask-loopie] Returning assistant message for ${sessionId}.`);
    return NextResponse.json(assistantMessage);

  } catch (error) {
     console.error(`[API POST /api/ask-loopie] UNHANDLED error processing request for ${sessionId}:`, error);
     let errorMessage = 'Internal Server Error';
     if (error instanceof Error) {
         errorMessage = error.message;
     }
     // Ensure the error response is JSON
     return NextResponse.json({ error: 'Failed to process chat message', details: errorMessage }, { status: 500 });
  }
} 