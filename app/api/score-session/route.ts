import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import OpenAI from 'openai';
import { type SessionStatus, type SessionMetadata } from '../../../lib/types/session'; // Import from shared types
import { sendDiscordAlert } from '../../../lib/monitoringUtils'; // Import the alert function
import { logger, LogPayload } from '../../../lib/logger'; // Import logger

// Updated Rubric Interfaces to match the new structure
interface ScoringDetail {
  '1': string;
  '2': string;
  '3': string;
  '4': string;
}

interface RubricDimensionDefinition {
  dimension: string;
  description: string;
  subcriteria: string[];
  exemplar_response?: string | string[];
}

interface RoleVariantDetail {
  emphasized_dimensions: string[];
}

interface RoleVariants {
  zero_to_one_pm?: RoleVariantDetail;
  growth_pm?: RoleVariantDetail;
  consumer_pm?: RoleVariantDetail;
  [key: string]: RoleVariantDetail | undefined;
}

interface RubricMetadata {
  role_variants?: RoleVariants;
  minimum_bar?: {
    required_dimensions: string[];
    rule: string;
  };
}

interface RubricDefinition {
  scoring_scale: ScoringDetail;
  evaluation_criteria: RubricDimensionDefinition[];
  scoring_guide: {
    "Strong Hire": string;
    "Hire": string;
    "Mixed": string;
    "No Hire": string;
    [key: string]: string;
  };
  metadata?: RubricMetadata;
}

interface Rubric {
  _id?: ObjectId;
  name: string;
  definition: RubricDefinition;
  systemPrompt?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// For TranscriptEntry (ensure this matches the structure in transcripts/route.ts)
interface TranscriptEntry {
  _id?: ObjectId;
  sessionId: string;
  role: 'interviewer' | 'candidate' | 'system';
  content: string;
  timestamp: Date;
  createdAt?: Date;
}

// Interfaces for the Scoring API
// Updated ScoreItem interface for structured feedback
interface ScoreItem {
  dimension: string;
  score: number | null; // Allow null for unreached dimensions
  feedback: {
    strengths: string[];
    weaknesses: string[];
    exemplar_response_suggestion?: string; // Added for LLM-generated exemplar
  };
}

// LLMScoreResponse uses the updated ScoreItem
interface LLMScoreResponse {
  scores: ScoreItem[];
  overall_recommendation: 'Strong Hire' | 'Hire' | 'Mixed' | 'No Hire';
  summary_feedback?: string;
}

// StoredScore uses the updated LLMScoreResponse
interface StoredScore {
  _id?: ObjectId;
  sessionId: string;
  rubricId: ObjectId;
  rubricName?: string;
  llmResponse: LLMScoreResponse;
  fullTranscriptText?: string;
  promptUsed?: string;
  llmModelUsed?: string;
  scoredAt: Date;
}

// START_SYSTEM_PROMPT_REPLACEMENT
const DEFAULT_SYSTEM_PROMPT = `\nYou are an expert product management interviewer and calibrated evaluator. You are scoring product sense interviews for senior PM candidates at top-tier tech companies.\n\nYou are provided:\n\n* A product sense interview transcript.\n* A structured rubric with:\n\n  * \`evaluation_criteria\` (list of dimensions),\n  * \`scoring_scale\` (1–4 or null),\n  * \`scoring_guide\` (explanation of each score per dimension).\n\n## Core Principles\n\n* **Grounding:** Only use direct evidence from the transcript. Do *not* infer intent, capability, or thought processes not explicitly stated.\n* **Objectivity:** Apply the rubric consistently and fairly based only on transcript content.\n* **Clarity:** Feedback must be specific, actionable, and skimmable.\n* **Format Compliance:** Your output must strictly follow the provided JSON schema.\n\n## Your Task\n\nProduce a JSON object matching the schema below. For each dimension:\n\n1. Assign a score (\`1–4\` or \`null\` if not reached).\n2. Write specific, coaching-style feedback in **second person**.\n\n   * \`strengths\`: Up to 2 bullet points of what the candidate did well, using direct quotes or paraphrases from the transcript.\n   * \`weaknesses\`: Up to 2 bullet points of specific gaps, omissions, or missteps, also grounded in the transcript.\n3. If the score is less than 4  include an \`exemplar_response_suggestion\`: a short, **first-person** example of what a top-tier candidate might have said for that dimension.\n\n   * Format: "I would ask...", "My instinct would be to...", "One thing I'd want to understand is…"\n\nIf a dimension was not reached:\n\n* Set \`score\` to 0.\n* Set \`strengths\` to an empty array \`[]\`.\n* Set \`weaknesses\` to an empty array \`[]\`.\n* For \`feedback.exemplar_response_suggestion\`, provide a generic, first-person tip on how a candidate could proactively ensure this dimension is addressed in a future interview. This tip should be specific to the nature of the dimension that was missed. For example:\n    * If 'Exploring Solutions' was not reached, a suggestion might be: "To ensure solution exploration is covered next time, I might transition by saying, 'Now that we've thoroughly defined the problem and user, I'd like to brainstorm a few potential high-level solutions. My initial thoughts are...'"\n    * If 'Clarifying the Problem' was not adequately covered (leading to a low score or considered 'not reached' if truly no attempt was made), the suggestion might be: "To make sure I fully understand the problem upfront next time, I would start by asking questions like, 'Could you tell me more about how this problem manifests for users?' or 'What are the key goals we're trying to achieve by solving this?'"\n\n## Output JSON Schema\n\n\`\`\`json\n{\n  \"scores\": [\n    {\n      \"dimension\": \"<Exact name from evaluation_criteria>\",\n      \"score\": <1–4 or null>,\n      \"feedback\": {\n        \"strengths\": [\n          \"<Bullet point>\",\n          \"<Bullet point>\"\n        ],\n        \"weaknesses\": [\n          \"<Bullet point>\",\n          \"<Bullet point>\"\n        ],\n        \"exemplar_response_suggestion\": \"<Only if score < 4 and not null>\"\n      }\n    }\n    // Repeat for each rubric dimension\n  ],\n  \"overall_recommendation\": \"<Strong Hire | Hire | Mixed | No Hire>\",\n  \"summary_feedback\": \"Start with a motivating sentence (e.g., 'You're on the right track…'). Then mention 1–2 clear strengths and 1–2 concrete improvement areas seen in the transcript. Write in second person. Max 3 sentences.\"\n}\n\`\`\`\n`;

// END_SYSTEM_PROMPT_REPLACEMENT

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to update session metadata status
async function updateSessionStatus(sessionId: string, status: SessionStatus, error?: string | null) {
  try {
    const { db } = await connectToDatabase();
    const now = new Date();
    await db.collection('sessions_metadata').updateOne(
      { sessionId }, 
      { $set: { status: status, status_updated_at: now, status_error: error === undefined ? null : error, updatedAt: now }}
    );
    logger.info({ event: 'SessionStatusUpdated', details: { sessionId, status, error: error || undefined } });

    if (status === 'scoring_failed_llm' || status === 'scoring_failed_db') {
      sendDiscordAlert(
        `Scoring Failed: ${status.replace('scoring_failed_', '').toUpperCase()}`, // e.g., "Scoring Failed: LLM"
        `Scoring process failed for session ID: ${sessionId}.`, 
        [
          { name: "Session ID", value: sessionId, inline: true },
          { name: "Status", value: status, inline: true },
          { name: "Error", value: error || 'No specific error message provided.', inline: false }
        ]
      );
      logger.info({event: 'DiscordAlertSentForScoringFailure', details: { sessionId, status, error }});
    }
  } catch (dbError: any) {
    logger.error({ event: 'UpdateSessionStatusError', details: { sessionId, status, attemptedError: error }, error: { message: dbError.message, stack: dbError.stack } });
  }
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    logger.error({event: 'OpenAIKeyMissing', message: 'OPENAI_API_KEY is not configured.'});
    return NextResponse.json({ error: 'Server configuration error: Missing OpenAI API key.' }, { status: 500 });
  }

  let sessionId: string | undefined;
  let rubricId: string | undefined;

  try {
    const body = await request.json();
    sessionId = body.sessionId as string;
    rubricId = body.rubricId as string;

    if (!sessionId || !rubricId) {
      return NextResponse.json({ error: 'Missing sessionId or rubricId' }, { status: 400 });
    }
    
    logger.info({event: 'ScoreSessionRequestReceived', details: { sessionId, rubricId }});
    await updateSessionStatus(sessionId, 'scoring_in_progress');

    const { db } = await connectToDatabase();

    const transcripts = await db.collection<TranscriptEntry>('transcripts')
      .find({ sessionId })
      .sort({ timestamp: 1 })
      .toArray();

    if (!transcripts || transcripts.length === 0) {
      await updateSessionStatus(sessionId, 'scoring_failed_db', `No transcripts found for sessionId: ${sessionId}`);
      return NextResponse.json({ error: `No transcripts found for sessionId: ${sessionId}` }, { status: 404 });
    }

    const fullTranscript = transcripts.map(t => `${t.role}: ${t.content}`).join('\n\n');

    let mongoRubricId;
    try {
      mongoRubricId = new ObjectId(rubricId);
    } catch (e) {
      await updateSessionStatus(sessionId, 'scoring_failed_db', 'Invalid rubricId format received.');
      return NextResponse.json({ error: 'Invalid rubricId format' }, { status: 400 });
    }
    const rubric = await db.collection<Rubric>('rubrics').findOne({ _id: mongoRubricId });

    if (!rubric) {
      await updateSessionStatus(sessionId, 'scoring_failed_db', `Rubric not found for rubricId: ${rubricId}`);
      return NextResponse.json({ error: `Rubric not found for rubricId: ${rubricId}` }, { status: 404 });
    }

    const systemPromptToUse = rubric.systemPrompt || DEFAULT_SYSTEM_PROMPT;

    const userPrompt = `Please evaluate the following interview transcript against the provided rubric.\n\n**Rubric: ${rubric.name}**\nRubric Definition (note 'evaluation_criteria' is an array of dimensions):\n${JSON.stringify(rubric.definition, null, 2)}\n\n**Interview Transcript:**\n${fullTranscript}\n\nProvide your evaluation ONLY in the specified JSON format, ensuring a score item for each dimension in 'evaluation_criteria'.`;

    const llmModel = "chatgpt-4o-latest";

    try {
      logger.info({event: 'LLMCallAttempt', details: { sessionId, model: llmModel }});
      const completion = await openai.chat.completions.create({
        model: llmModel,
        messages: [
          { role: 'system', content: systemPromptToUse },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const llmResponseContent = completion.choices[0]?.message?.content;

      if (!llmResponseContent) {
        throw new Error('LLM returned no content');
      }

      let parsedLLMResponse: LLMScoreResponse;
      try {
        parsedLLMResponse = JSON.parse(llmResponseContent);
      } catch (parseError) {
        console.error('Failed to parse LLM JSON response:', parseError);
        console.error('Raw LLM response content:', llmResponseContent);
        await updateSessionStatus(sessionId, 'scoring_failed_db', 'Failed to parse LLM response as JSON. Raw response logged.');
        return NextResponse.json({ error: 'Failed to parse LLM response as JSON. Raw response logged.', rawResponse: llmResponseContent }, { status: 500 });
      }
      
      // TODO: Add validation for parsedLLMResponse structure

      const newScoreEntry: StoredScore = {
        sessionId,
        rubricId: mongoRubricId,
        rubricName: rubric.name,
        llmResponse: parsedLLMResponse,
        fullTranscriptText: fullTranscript,
        llmModelUsed: llmModel,
        scoredAt: new Date(),
      };

      try {
        const scoreResult = await db.collection<StoredScore>('scores').insertOne(newScoreEntry);
        if (!scoreResult.insertedId) {
          throw new Error('Failed to get insertedId after saving score.');
        }
        const createdScore = await db.collection<StoredScore>('scores').findOne({ _id: scoreResult.insertedId });
        logger.info({ event: 'ScoreSaveSuccess', details: { sessionId, scoreId: scoreResult.insertedId } });
        await updateSessionStatus(sessionId, 'scored_successfully');
        return NextResponse.json({ message: 'Session scored successfully', score: createdScore }, { status: 201 });
      } catch (dbSaveError: any) {
        const errorMessage = dbSaveError.message || 'Failed to save score to database';
        logger.error({ event: 'ScoreSaveError', details: { sessionId }, message: errorMessage, error: dbSaveError });
        await updateSessionStatus(sessionId, 'scoring_failed_db', errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
      }

    } catch (llmError: any) {
      const errorMessage = llmError instanceof OpenAI.APIError ? llmError.message : (llmError.message || 'Unknown LLM error');
      logger.error({ event: 'LLMCallError', details: { sessionId }, message: errorMessage, error: llmError });
      await updateSessionStatus(sessionId, 'scoring_failed_db', errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

  } catch (error: any) {
    const errorMessage = error.message || 'Unhandled error in scoring route';
    logger.error({event: 'ScoreSessionUnhandledError', details: { sessionId: sessionId || 'unknown' }, message: errorMessage, error: error});
    const finalSessionId = sessionId || 'unknown_session'; // Use sessionId if available for status update
    if (sessionId) { // Only update status if we have a sessionId
        await updateSessionStatus(finalSessionId, 'scoring_failed_db', errorMessage);
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    if (error instanceof OpenAI.APIError) { // Should be caught by inner try/catch, but as a fallback
        console.error('[SCORE-SESSION FALLBACK] OpenAI API Error:', error.status, error.message, error.code, error.type);
        return NextResponse.json({ error: `OpenAI API Error: ${error.message}` }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: 'Failed to score session due to an unexpected error' }, { status: 500 });
  }
} 