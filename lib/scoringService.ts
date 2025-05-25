import { ObjectId } from 'mongodb';
import OpenAI from 'openai';
import { connectToDatabase } from './mongodb'; // Adjust path as needed
import { logger } from './logger'; // Adjust path as needed

// TODO: Refactor these interfaces and DEFAULT_SYSTEM_PROMPT to shared type/constant files
// Locally defined interfaces and constant for now:
interface ScoringDetail { '1': string; '2': string; '3': string; '4': string; }
interface RubricDimensionDefinition {
  dimension: string; description: string; subcriteria: string[]; exemplar_response?: string | string[];
}
interface RoleVariantDetail { emphasized_dimensions: string[]; }
interface RoleVariants { [key: string]: RoleVariantDetail | undefined; }
interface RubricMetadata { role_variants?: RoleVariants; minimum_bar?: { required_dimensions: string[]; rule: string; }; }
interface RubricDefinition {
  scoring_scale: ScoringDetail; evaluation_criteria: RubricDimensionDefinition[];
  scoring_guide: { "Strong Hire": string; "Hire": string; "Mixed": string; "No Hire": string; [key: string]: string; };
  metadata?: RubricMetadata;
}
export interface Rubric { // Export if other parts of lib might use it directly
  _id?: ObjectId; name: string; definition: RubricDefinition; systemPrompt?: string; createdAt?: Date; updatedAt?: Date;
}
export interface TranscriptEntry { // Export if needed
  _id?: ObjectId; sessionId: string; role: 'interviewer' | 'candidate' | 'system'; content: string; timestamp: Date; createdAt?: Date;
}
interface ScoreItem { dimension: string; score: number | null; feedback: { strengths: string[]; weaknesses: string[]; exemplar_response_suggestion?: string; };}
export interface LLMScoreResponse { // Export if needed by worker directly
  scores: ScoreItem[]; overall_recommendation: 'Strong Hire' | 'Hire' | 'Mixed' | 'No Hire'; summary_feedback?: string;
}
export interface StoredScore { // Export as this is the return type
  _id?: ObjectId; sessionId: string; rubricId: ObjectId; rubricName?: string; llmResponse: LLMScoreResponse;
  fullTranscriptText?: string; promptUsed?: string; llmModelUsed?: string; scoredAt: Date;
}

const DEFAULT_SYSTEM_PROMPT = `\nYou are an expert product management interviewer and calibrated evaluator. You are scoring product sense interviews for senior PM candidates at top-tier tech companies.\n\nYou are provided:\n\n* A product sense interview transcript.\n* A structured rubric with:\n\n  * \`evaluation_criteria\` (list of dimensions),\n  * \`scoring_scale\` (1–4 or null),\n  * \`scoring_guide\` (explanation of each score per dimension).\n\n## Core Principles\n\n* **Grounding:** Only use direct evidence from the transcript. Do *not* infer intent, capability, or thought processes not explicitly stated.\n* **Objectivity:** Apply the rubric consistently and fairly based only on transcript content.\n* **Clarity:** Feedback must be specific, actionable, and skimmable.\n* **Format Compliance:** Your output must strictly follow the provided JSON schema.\n\n## Your Task\n\nProduce a JSON object matching the schema below. For each dimension:\n\n1. Assign a score (\`1–4\` or \`null\` if not reached).\n2. Write specific, coaching-style feedback in **second person**.\n\n   * \`strengths\`: Up to 2 bullet points of what the candidate did well, using direct quotes or paraphrases from the transcript.\n   * \`weaknesses\`: Up to 2 bullet points of specific gaps, omissions, or missteps, also grounded in the transcript.\n3. If the score is less than 4  include an \`exemplar_response_suggestion\`: a short, **first-person** example of what a top-tier candidate might have said for that dimension.\n\n   * Format: "I would ask...", "My instinct would be to...", "One thing I'd want to understand is…"\n\nIf a dimension was not reached:\n\n* Set \`score\` to 0.\n* Set \`strengths\` to an empty array \`[]\`.\n* Set \`weaknesses\` to an empty array \`[]\`.\n* For \`feedback.exemplar_response_suggestion\`, provide a generic, first-person tip on how a candidate could proactively ensure this dimension is addressed in a future interview. This tip should be specific to the nature of the dimension that was missed. For example:\n    * If 'Exploring Solutions' was not reached, a suggestion might be: "To ensure solution exploration is covered next time, I might transition by saying, 'Now that we've thoroughly defined the problem and user, I'd like to brainstorm a few potential high-level solutions. My initial thoughts are...'"\n    * If 'Clarifying the Problem' was not adequately covered (leading to a low score or considered 'not reached' if truly no attempt was made), the suggestion might be: "To make sure I fully understand the problem upfront next time, I would start by asking questions like, 'Could you tell me more about how this problem manifests for users?' or 'What are the key goals we're trying to achieve by solving this?'"\n\n## Output JSON Schema\n\n\`\`\`json\n{\n  \"scores\": [\n    {\n      \"dimension\": \"<Exact name from evaluation_criteria>\",\n      \"score\": <1–4 or null>,\n      \"feedback\": {\n        \"strengths\": [\n          \"<Bullet point>\",\n          \"<Bullet point>\"\n        ],\n        \"weaknesses\": [\n          \"<Bullet point>\",\n          \"<Bullet point>\"\n        ],\n        \"exemplar_response_suggestion\": \"<Only if score < 4 and not null>\"\n      }\n    }\n    // Repeat for each rubric dimension\n  ],\n  \"overall_recommendation\": \"<Strong Hire | Hire | Mixed | No Hire>\",\n  \"summary_feedback\": \"Start with a motivating sentence (e.g., 'You're on the right track…'). Then mention 1–2 clear strengths and 1–2 concrete improvement areas seen in the transcript. Write in second person. Max 3 sentences.\"\n}\n\`\`\`\n`;
// END TODO

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// This error class can be used to differentiate LLM errors from other errors
export class LLMProcessingError extends Error {
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = "LLMProcessingError";
  }
}

export class DatabaseError extends Error {
    constructor(message: string, public cause?: any) {
      super(message);
      this.name = "DatabaseError";
    }
  }

export async function executeScoring(sessionId: string, rubricIdString: string): Promise<StoredScore> {
  logger.info({ event: 'ExecuteScoringStarted', details: { sessionId, rubricIdString } });

  if (!process.env.OPENAI_API_KEY) {
    logger.error({event: 'OpenAIKeyMissing', message: 'OPENAI_API_KEY is not configured for scoring service.'});
    throw new Error('Server configuration error: Missing OpenAI API key for scoring service.');
  }

  const { db } = await connectToDatabase();
  let mongoRubricId;
  try {
    mongoRubricId = new ObjectId(rubricIdString);
  } catch (e) {
    logger.error({ event: 'InvalidRubricIdFormat', details: { sessionId, rubricIdString }, error: e });
    throw new DatabaseError('Invalid rubricId format provided to scoring service.');
  }

  const rubric = await db.collection<Rubric>('rubrics').findOne({ _id: mongoRubricId });
  if (!rubric) {
    logger.warn({ event: 'RubricNotFoundForScoring', details: { sessionId, rubricId: rubricIdString } });
    throw new DatabaseError(`Rubric not found for rubricId: ${rubricIdString}`);
  }

  const transcripts = await db.collection<TranscriptEntry>('transcripts')
    .find({ sessionId })
    .sort({ timestamp: 1 })
    .toArray();

  if (!transcripts || transcripts.length === 0) {
    logger.warn({ event: 'NoTranscriptsFoundForScoring', details: { sessionId } });
    throw new DatabaseError(`No transcripts found for sessionId: ${sessionId}`);
  }
  const fullTranscript = transcripts.map(t => `${t.role}: ${t.content}`).join('\n\n');
  const systemPromptToUse = rubric.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  const userPrompt = `Please evaluate the following interview transcript against the provided rubric.\n\n**Rubric: ${rubric.name}**\nRubric Definition (note 'evaluation_criteria' is an array of dimensions):\n${JSON.stringify(rubric.definition, null, 2)}\n\n**Interview Transcript:**\n${fullTranscript}\n\nProvide your evaluation ONLY in the specified JSON format, ensuring a score item for each dimension in 'evaluation_criteria'.`;
  const llmModel = "gpt-4o-latest";

  let parsedLLMResponse: LLMScoreResponse;
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
      throw new LLMProcessingError('LLM returned no content');
    }
    parsedLLMResponse = JSON.parse(llmResponseContent);
    logger.info({event: 'LLMCallSuccess', details: { sessionId, model: llmModel, choiceCount: completion.choices.length }});
  } catch (llmError: any) {
    const errorMessage = llmError instanceof OpenAI.APIError 
      ? llmError.message 
      : (llmError.message || 'Unknown LLM error');
    logger.error({ event: 'LLMCallError', details: { sessionId }, message: errorMessage, error: llmError });
    throw new LLMProcessingError(errorMessage, llmError);
  }
  
  // TODO: Add validation for parsedLLMResponse structure against expected schema

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
      throw new DatabaseError('Failed to get insertedId after saving score.');
    }
    // Fetch the created score to return it, including its _id
    const createdScore = await db.collection<StoredScore>('scores').findOne({ _id: scoreResult.insertedId });
    if (!createdScore) {
        throw new DatabaseError('Failed to retrieve saved score.');
    }
    logger.info({ event: 'ScoreSaveSuccess', details: { sessionId, scoreId: scoreResult.insertedId } });
    return createdScore;
  } catch (dbSaveError: any) {
    logger.error({ event: 'ScoreSaveError', details: { sessionId }, message: dbSaveError.message, error: dbSaveError });
    throw new DatabaseError(dbSaveError.message || 'Failed to save score to database', dbSaveError);
  }
} 