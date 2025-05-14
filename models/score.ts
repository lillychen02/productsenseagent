import { Schema, model, models, Types } from 'mongoose';
import { StoredScore, LLMScoreResponse, ScoreItem, ScoreFeedback } from '@/types';

// Sub-schemas for LLMScoreResponse
const ScoreFeedbackSchema = new Schema<ScoreFeedback>(
  {
    strengths: { type: [String], required: true },
    weaknesses: { type: [String], required: true },
    exemplar_response_suggestion: String,
  },
  { _id: false }
);

const ScoreItemSchema = new Schema<ScoreItem>(
  {
    dimension: { type: String, required: true },
    score: {
      type: Schema.Types.Mixed, // Can be number or null
      validate: {
        validator: function(v: any) {
          return v === null || typeof v === 'number';
        },
        message: props => `${props.value} is not a valid score (null or number)`
      },
      required: false, // Explicitly allow null/undefined if score is not always present
      default: null, 
    },
    feedback: { type: ScoreFeedbackSchema, required: true },
  },
  { _id: false }
);

const LLMScoreResponseSchema = new Schema<LLMScoreResponse>(
  {
    scores: { type: [ScoreItemSchema], required: true },
    overall_recommendation: {
      type: String,
      enum: ['Strong Hire', 'Hire', 'Mixed', 'No Hire'],
      required: true,
    },
    summary_feedback: String,
  },
  { _id: false }
);

// Top-level StoredScore schema
const StoredScoreSchema = new Schema<StoredScore>(
  {
    sessionId: { type: String, required: true, index: true }, // Index for faster lookups
    rubricId: { type: Schema.Types.ObjectId, ref: 'Rubric', required: true },
    rubricName: String,
    llmResponse: { type: LLMScoreResponseSchema, required: true },
    fullTranscriptText: String,
    promptUsed: String,
    llmModelUsed: String,
    scoredAt: { type: Date, required: true },
  },
  { timestamps: true } // Adds createdAt and updatedAt automatically
);

// Prevent model overwrite in Next.js hot reloading
export const ScoreModel = models.Score || model<StoredScore>('Score', StoredScoreSchema); 