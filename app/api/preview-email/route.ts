import { NextRequest, NextResponse } from 'next/server';
import { type InterviewData } from '../../../lib/types/email';
import { createSimpleEmailHtml } from '../../../lib/emailUtils';
import { connectToDatabase } from '../../../lib/mongodb'; // Adjust path as per your project structure
import { ObjectId } from 'mongodb';
import { logger } from '../../../lib/logger'; // Import refined logger
// import { type SkillFeedback } from '../../../lib/types/session'; // Temporarily remove import

// Define SkillFeedback locally for this route to isolate import issues
interface SkillFeedback { 
  strengths: string[];
  weaknesses: string[];
  exemplar_response_suggestion?: string;
}

// Interfaces for DB data (can be shared if defined elsewhere, e.g., from send-results or results page)
interface ScoreItem {
  dimension: string;
  score: number | null;
  feedback: {
    strengths: string[];
    weaknesses: string[];
    exemplar_response_suggestion?: string;
  };
}
interface LLMScoreResponse {
  scores: ScoreItem[];
  overall_recommendation: string;
  summary_feedback?: string;
}
interface StoredScore {
  _id?: ObjectId;
  sessionId: string;
  rubricId: ObjectId;
  rubricName?: string;
  llmResponse: LLMScoreResponse;
  scoredAt: Date;
}
// Helper to get emoji for score - can be moved to a util if used elsewhere
const getScoreEmoji = (score: number | null): string => {
  if (score === 1) return '🔴';
  if (score === 2) return '🟡';
  if (score === 3 || score === 4) return '🟢';
  return '⚪'; 
};

// Define local interfaces for DB data if not importing from a central place (e.g. from score-session route)
interface ScoreItemLocal {
  dimension: string;
  score: number | null;
  feedback: SkillFeedback; // Using locally defined SkillFeedback type
}
interface LLMScoreResponseLocal {
  scores: ScoreItemLocal[];
  overall_recommendation: string;
  summary_feedback?: string;
}
interface StoredScoreLocal {
  _id?: ObjectId;
  sessionId: string;
  rubricId: ObjectId;
  rubricName?: string;
  llmResponse: LLMScoreResponseLocal;
  scoredAt: Date;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const sessionIdFromQuery = url.searchParams.get("sessionId");
  const userName = url.searchParams.get("userName") || "Valued User";
  logger.info({ event: 'PreviewEmailRequest', details: { sessionId: sessionIdFromQuery, userName } });

  let reportData: InterviewData;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://askloopie.com';

  if (sessionIdFromQuery) {
    try {
      const { db } = await connectToDatabase();
      const scoreData = await db.collection<StoredScoreLocal>('scores').find({ sessionId: sessionIdFromQuery }).sort({ scoredAt: -1 }).limit(1).next();

      if (!scoreData) {
        throw new Error(`No score data found for session ID: ${sessionIdFromQuery}`);
      }
      
      reportData = {
        recommendation: scoreData.llmResponse?.overall_recommendation || 'N/A',
        date: new Date(scoreData.scoredAt).toLocaleDateString(),
        interviewType: scoreData.rubricName || 'General Interview',
        skills: scoreData.llmResponse?.scores?.map((skill: ScoreItemLocal) => ({
          name: skill.dimension,
          score: skill.score,
          emoji: getScoreEmoji(skill.score), 
          feedback: skill.feedback, // This should now align with the local SkillFeedback type
        })) || [],
        summary: scoreData.llmResponse?.summary_feedback || 'No summary provided.',
        sessionLink: `${appUrl}/results/${sessionIdFromQuery}`,
      };
      logger.info({event: 'PreviewEmailDataFetched', details: { sessionId: sessionIdFromQuery }});
    } catch (error: any) {
      logger.error({event: 'PreviewEmailDataFetchError', details: { sessionId: sessionIdFromQuery }, message: error.message, error: error});
      // Construct mock data that matches InterviewData structure for error display
      reportData = {
        recommendation: "Error Loading Data for Preview",
        date: new Date().toLocaleDateString(),
        interviewType: "Data Fetch Error",
        skills: [],
        summary: `Could not load data for session ${sessionIdFromQuery} for preview. Error: ${error.message}`,
        sessionLink: `${appUrl}/results/error-preview`,
      };
    }
  } else {
    logger.info({event: 'PreviewEmailUsingMockData'});
    // Ensure mock data conforms to InterviewData, including the nested feedback structure if you want to preview it.
    reportData = {
      recommendation: "Hire (Mock Data)",
      date: new Date().toLocaleDateString(),
      interviewType: "Product Design Mock Interview",
      skills: [
        { name: "User Empathy", score: 4, emoji: "👥", feedback: { strengths: ["Listened well."], weaknesses: [], exemplar_response_suggestion: "Keep it up!" } },
        { name: "Visual Design", score: 3, emoji: "🎨", feedback: { strengths: ["Good color use."], weaknesses: ["Improve typography."] } },
        { name: "Prototyping", score: null, emoji: "⚙️", feedback: undefined }, // Explicitly undefined if no feedback
      ],
      summary: "This is mock summary data. Candidate showed strong user empathy.",
      sessionLink: `${appUrl}/results/mock-preview-session`,
    };
  }
  
  const htmlContent = createSimpleEmailHtml(userName, reportData);

  return new NextResponse(htmlContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
} 