import { ObjectId } from 'mongodb'; // Assuming ObjectId might be needed by some interfaces

// --- Rubric Related Interfaces ---
export interface ScoringDetail {
  '1': string;
  '2': string;
  '3': string;
  '4': string;
}

export interface RubricDimensionDefinition {
  dimension: string;
  description: string;
  subcriteria: string[];
  exemplar_response?: string | string[];
}

export interface RoleVariantDetail {
  emphasized_dimensions: string[];
}

export interface RoleVariants {
  zero_to_one_pm?: RoleVariantDetail;
  growth_pm?: RoleVariantDetail;
  consumer_pm?: RoleVariantDetail;
  [key: string]: RoleVariantDetail | undefined;
}

export interface RubricMetadata {
  role_variants?: RoleVariants;
  minimum_bar?: {
    required_dimensions: string[];
    rule: string;
  };
}

export interface RubricDefinition {
  scoring_scale: ScoringDetail;
  evaluation_criteria: RubricDimensionDefinition[];
  scoring_guide: {
    "Strong Hire": string;
    "Hire": string;
    "Mixed": string;
    "No Hire": string;
    [key: string]: string; // Allow for other potential keys if structure varies slightly
  };
  metadata?: RubricMetadata;
}

export interface Rubric {
  _id?: ObjectId; // From mongodb
  name: string;
  definition: RubricDefinition;
  systemPrompt?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// --- TranscriptEntry Interface ---
export interface TranscriptEntry {
  _id?: ObjectId; // From mongodb
  sessionId: string;
  role: 'interviewer' | 'candidate' | 'system';
  content: string;
  timestamp: Date;
  createdAt?: Date;
}

// --- Scoring API Related Interfaces ---
export interface ScoreFeedback {
  strengths: string[];
  weaknesses: string[];
  exemplar_response_suggestion?: string;
}

export interface ScoreItem {
  dimension: string;
  score: number | null;
  feedback: ScoreFeedback;
}

export interface LLMScoreResponse {
  scores: ScoreItem[];
  overall_recommendation: 'Strong Hire' | 'Hire' | 'Mixed' | 'No Hire';
  summary_feedback?: string;
}

export interface StoredScore {
  _id?: ObjectId; // From mongodb
  sessionId: string;
  rubricId: ObjectId; // From mongodb
  rubricName?: string;
  llmResponse: LLMScoreResponse;
  fullTranscriptText?: string;
  promptUsed?: string;
  llmModelUsed?: string;
  scoredAt: Date;
}

// --- Session Metadata Interface ---
export interface SessionMetadata {
  _id?: ObjectId; // From mongodb
  sessionId: string;
  rubricId: ObjectId; // From mongodb
  rubricName?: string;
  interviewType?: string;
  startTime: Date;
  status: 'started' | 'webhook_received' | 'scoring_triggered' | 'scored' | 'error_scoring' | 'error_webhook' | 'webhook_received_not_scored';
  updatedAt: Date;
}

// --- Results Page Data Structure (Frontend) ---
// This is for the data structure expected by the ResultsPage component after fetching from /api/results/[sessionId]
export interface ClientScoreData { // Renamed to avoid conflict with StoredScore if imported in same file
  _id?: string; // ObjectId stringified
  sessionId: string;
  rubricName?: string;
  llmResponse: LLMScoreResponse; // Uses the common LLMScoreResponse
  scoredAt: string; // Date stringified
  // Include other fields from StoredScore if the API sends them and page uses them
}

export interface ClientResultData {
  scoreData: ClientScoreData;
  rubricDefinition?: RubricDefinition; // Rubric definition is now also fetched
  transcriptText: string;
  audioDownloadUrl: string | null;
} 