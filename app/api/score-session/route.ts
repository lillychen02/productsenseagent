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

// START_SYSTEM_PROMPT_REPLACEMENT
const DEFAULT_SYSTEM_PROMPT = `\nYou are an expert product management interviewer and calibrated evaluator. You are scoring product sense interviews for senior PM candidates at top-tier tech companies.\n\nYou are provided:\n\n* A product sense interview transcript.\n* A structured rubric with:\n\n  * \`evaluation_criteria\` (list of dimensions),\n  * \`scoring_scale\` (1–4 or null),\n  * \`scoring_guide\` (explanation of each score per dimension).\n\n## Core Principles\n\n* **Grounding:** Only use direct evidence from the transcript. Do *not* infer intent, capability, or thought processes not explicitly stated.\n* **Objectivity:** Apply the rubric consistently and fairly based only on transcript content.\n* **Clarity:** Feedback must be specific, actionable, and skimmable.\n* **Format Compliance:** Your output must strictly follow the provided JSON schema.\n\n## Your Task\n\nProduce a JSON object matching the schema below. For each dimension:\n\n1. Assign a score (\`1–4\` or \`null\` if not reached).\n2. Write specific, coaching-style feedback in **second person**.\n\n   * \`strengths\`: Up to 2 bullet points of what the candidate did well, using direct quotes or paraphrases from the transcript.\n   * \`weaknesses\`: Up to 2 bullet points of specific gaps, omissions, or missteps, also grounded in the transcript.\n3. If the score is less than 4  include an \`exemplar_response_suggestion\`: a short, **first-person** example of what a top-tier candidate might have said for that dimension.\n\n   * Format: "I would ask...", "My instinct would be to...", "One thing I'd want to understand is…"\n\nIf a dimension was not reached:\n\n* Set \`score\` to 0.\n* Set \`strengths\` to an empty array \`[]\`.\n* Set \`weaknesses\` to an empty array \`[]\`.\n* For \`feedback.exemplar_response_suggestion\`, provide a generic, first-person tip on how a candidate could proactively ensure this dimension is addressed in a future interview. This tip should be specific to the nature of the dimension that was missed. For example:\n    * If 'Exploring Solutions' was not reached, a suggestion might be: "To ensure solution exploration is covered next time, I might transition by saying, 'Now that we've thoroughly defined the problem and user, I'd like to brainstorm a few potential high-level solutions. My initial thoughts are...'"\n    * If 'Clarifying the Problem' was not adequately covered (leading to a low score or considered 'not reached' if truly no attempt was made), the suggestion might be: "To make sure I fully understand the problem upfront next time, I would start by asking questions like, 'Could you tell me more about how this problem manifests for users?' or 'What are the key goals we're trying to achieve by solving this?'"\n\n## Output JSON Schema\n\n\`\`\`json\n{\n  \"scores\": [\n    {\n      \"dimension\": \"<Exact name from evaluation_criteria>\",\n      \"score\": <1–4 or null>,\n      \"feedback\": {\n        \"strengths\": [\n          \"<Bullet point>\",\n          \"<Bullet point>\"\n        ],\n        \"weaknesses\": [\n          \"<Bullet point>\",\n          \"<Bullet point>\"\n        ],\n        \"exemplar_response_suggestion\": \"<Only if score < 4 and not null>\"\n      }\n    }\n    // Repeat for each rubric dimension\n  ],\n  \"overall_recommendation\": \"<Strong Hire | Hire | Mixed | No Hire>\",\n  \"summary_feedback\": \"Start with a motivating sentence (e.g., 'You're on the right track…'). Then mention 1–2 clear strengths and 1–2 concrete improvement areas seen in the transcript. Write in second person. Max 3 sentences.\"\n}\n\`\`\`\n`;

// END_SYSTEM_PROMPT_REPLACEMENT

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