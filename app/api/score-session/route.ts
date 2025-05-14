import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import OpenAI from 'openai';

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

// --- Default System Prompt (Fallback) ---
const DEFAULT_SYSTEM_PROMPT = `You are an expert product management interviewer and calibrated evaluator. You are scoring product sense interviews for senior PM candidates at top-tier tech companies.\n\nYou are given:\n- A product sense interview transcript.\n- A structured rubric with evaluation_criteria, scoring_scale, and scoring_guide.\n\nCore Principles:\n- **Grounding:** Your evaluation MUST be based *solely* on evidence explicitly present in the provided transcript. Do NOT infer actions, knowledge, or intent that is not stated.\n- **Objectivity:** Apply the rubric criteria consistently and fairly based *only* on the transcript content.\n- **Accuracy:** Ensure dimension names and feedback accurately reflect the rubric and the transcript.\n\nYour task:\n1. Assign a score (1–4 or null) for each dimension in the rubric\\\'s evaluation_criteria, based strictly on the transcript evidence.\n2. Provide specific, coaching-style feedback (strengths/weaknesses) for each dimension, grounded in the transcript, written in the second person (e.g., \"You did well...\").\n3. For dimensions where the score is less than 4 (and not null), provide a concise \"exemplar_response_suggestion\". This suggestion should be a **direct example of an insightful question or statement a top-tier candidate might make for that dimension, phrased in the first person** (e.g., \"My first question would be...\").\n4. Use the scoring_guide and minimum_bar rules to determine the overall recommendation.\n\nYour response MUST match this JSON structure:\n\n{\n  \"scores\": [\n    {\n      \"dimension\": \"<Exact name from evaluation_criteria>\",\n      \"score\": <1–4 or null>,\n      \"feedback\": {\n        \"strengths\": [\n          \"<Bullet 1: specific strength demonstrated *in the transcript*>\",\n          \"<Bullet 2: another specific strength *verifiable in the transcript*>\"\n        ],\n        \"weaknesses\": [\n          \"<Bullet 1: specific weakness or missed opportunity *evident in the transcript*>\",\n          \"<Bullet 2: another specific gap *verifiable in the transcript*>\"\n        ],\n        \"exemplar_response_suggestion\": \"<Optional: If score < 4, a first-person example of an insightful question/statement, e.g., \\\'To clarify the goal, I would ask: Is the primary objective user growth or revenue for this initiative?\\\' >\"\n      }\n    }\n    // ... repeat for EACH dimension in the rubric\n  ],\n  \"overall_recommendation\": \"<Strong Hire | Hire | Mixed | No Hire>\",\n  \"summary_feedback\": \"<2-3 sentences max. Reference top strengths and critical gaps *observed in the transcript*. Speak directly to the candidate.>\"\n}\n\nUse the following example as a guide for tone, structure, and specificity. Note the exemplar_response_suggestion is a first-person direct statement/question:\n\n{\n  \"dimension\": \"Clarify the Prompt\",\n  \"score\": 3,\n  \"feedback\": {\n    \"strengths\": [\n      \"You asked whether the drop was happening among new users or existing users, which helped narrow the problem space.\",\n      \"You clarified the definition of \\\'user-generated content\\\' (Stories, Feed Posts, Reels), which demonstrated good framing.\"\n    ],\n    \"weaknesses\": [\n      \"You didn\\\'t confirm the geographic or platform constraints (e.g. global vs. US-only), which could have further focused your solution.\",\n      \"You paused for long stretches without proposing a structure, which slowed momentum and left the interviewer to steer.\"\n    ],\n    \"exemplar_response_suggestion\": \"My first clarifying questions would focus on the specifics of the decline: Is this drop seen across all types of digital goods, or concentrated in certain categories? And what are the key business objectives here—is it primarily revenue recovery, or are there other goals like engagement or creator support?\"\n  }\n}\n\nInstructions for writing feedback & exemplar suggestions:\n- Strengths, weaknesses, and summary_feedback should use the second person (“You asked…”) to speak directly to the candidate.\n- **Exemplar_response_suggestion** should be written in the **first person** (e.g., \"I would ask...\", \"My initial thought is...\") as if quoting an insightful statement or question from an ideal candidate.\n- Mirror the tone, format, and specificity shown in the example block above.\n- **Crucially:** Be specific and cite evidence from the transcript for strengths/weaknesses. Exemplar suggestions should be concrete and actionable examples of impactful questions or statements.\n- Each bullet for strengths/weaknesses must reference a concrete action, quote, or omission *from the transcript*. Avoid abstract generalities.\n- Exemplar suggestions should be brief and focus on a key question or statement that exemplifies top performance for that dimension.\n- Do not copy rubric text or use vague advice like “go deeper” or “be clearer” unless the transcript *demonstrates* a lack of depth or clarity.\n- If the transcript provides no strengths or no weaknesses for a dimension, return an empty array (\\\\\\\`[]\\\\\\\`).\n- If the dimension was not reached at all in the interview:\n  - score: null\n  - strengths: [\"This dimension was not reached in the interview.\"]\n  - weaknesses: [\"This dimension was not reached in the interview.\"]\n  - exemplar_response_suggestion: null // Or omit the field for unreached dimensions\n\nStyle and tone:\n- Bullet-based, concise, professional.\n- Feedback to the candidate is a direct debrief. Exemplar suggestions are illustrative first-person example statements/questions.\n- No filler, no apologies, no explanations outside the JSON.\n\nEnsure all string values are properly escaped and formatted for valid JSON. Output only the JSON object.\n`;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not configured.');
    return NextResponse.json({ error: 'Server configuration error: Missing OpenAI API key.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { sessionId, rubricId } = body as { sessionId: string; rubricId: string };

    if (!sessionId || !rubricId) {
      return NextResponse.json({ error: 'Missing sessionId or rubricId' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const transcripts = await db.collection<TranscriptEntry>('transcripts')
      .find({ sessionId })
      .sort({ timestamp: 1 })
      .toArray();

    if (!transcripts || transcripts.length === 0) {
      return NextResponse.json({ error: `No transcripts found for sessionId: ${sessionId}` }, { status: 404 });
    }

    const fullTranscript = transcripts.map(t => `${t.role}: ${t.content}`).join('\n\n');

    let mongoRubricId;
    try {
      mongoRubricId = new ObjectId(rubricId);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid rubricId format' }, { status: 400 });
    }
    const rubric = await db.collection<Rubric>('rubrics').findOne({ _id: mongoRubricId });

    if (!rubric) {
      return NextResponse.json({ error: `Rubric not found for rubricId: ${rubricId}` }, { status: 404 });
    }

    const systemPromptToUse = rubric.systemPrompt || DEFAULT_SYSTEM_PROMPT;

    const userPrompt = `Please evaluate the following interview transcript against the provided rubric.\n\n**Rubric: ${rubric.name}**\nRubric Definition (note 'evaluation_criteria' is an array of dimensions):\n${JSON.stringify(rubric.definition, null, 2)}\n\n**Interview Transcript:**\n${fullTranscript}\n\nProvide your evaluation ONLY in the specified JSON format, ensuring a score item for each dimension in 'evaluation_criteria'.`;

    const llmModel = 'chatgpt-4o-latest';

    console.log(`Calling OpenAI with model ${llmModel} using ${rubric.systemPrompt ? 'custom' : 'default'} system prompt.`);
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
      console.warn('LLM returned no content');
      return NextResponse.json({ error: 'LLM returned no content' }, { status: 500 });
    }

    let parsedLLMResponse: LLMScoreResponse;
    try {
      parsedLLMResponse = JSON.parse(llmResponseContent);
    } catch (parseError) {
      console.error('Failed to parse LLM JSON response:', parseError);
      console.error('Raw LLM response content:', llmResponseContent);
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

    const scoreResult = await db.collection<StoredScore>('scores').insertOne(newScoreEntry);

    if (!scoreResult.insertedId) {
      return NextResponse.json({ error: 'Failed to save score to database' }, { status: 500 });
    }

    const createdScore = await db.collection<StoredScore>('scores').findOne({ _id: scoreResult.insertedId });

    return NextResponse.json({ message: 'Session scored successfully', score: createdScore }, { status: 201 });

  } catch (error) {
    console.error('Error in /api/score-session:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    if (error instanceof OpenAI.APIError) {
        console.error('OpenAI API Error:', error.status, error.message, error.code, error.type);
        return NextResponse.json({ error: `OpenAI API Error: ${error.message}` }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: 'Failed to score session' }, { status: 500 });
  }
} 