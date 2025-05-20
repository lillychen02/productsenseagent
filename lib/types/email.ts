export interface SkillFeedback {
  strengths: string[];
  weaknesses: string[];
  exemplar_response_suggestion?: string;
}

export interface InterviewData {
  recommendation: string;
  date: string;
  interviewType: string;
  skills: { 
    name: string; 
    score: number | null; 
    emoji: string; 
    feedback?: SkillFeedback;
  }[];
  summary: string;
  sessionLink?: string;
} 