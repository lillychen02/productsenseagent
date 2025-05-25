import { NextRequest, NextResponse } from 'next/server';
import { type InterviewData, type SkillFeedback } from '../../../lib/types/email';
import { createSimpleEmailHtml } from '../../../lib/emailUtils';
import { connectToDatabase } from '../../../lib/mongodb'; // Adjust path as per your project structure
import { ObjectId } from 'mongodb';
import { logger } from '../../../lib/logger'; // Import refined logger

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
      const scoreData = await db.collection<StoredScore>('scores').find({ sessionId: sessionIdFromQuery }).sort({ scoredAt: -1 }).limit(1).next();

      if (!scoreData) {
        throw new Error(`No score data found for session ID: ${sessionIdFromQuery}`);
      }
      
      reportData = {
        recommendation: scoreData.llmResponse?.overall_recommendation || 'N/A',
        date: new Date(scoreData.scoredAt).toLocaleDateString(),
        interviewType: scoreData.rubricName || 'General Interview',
        skills: scoreData.llmResponse?.scores?.map((skill: ScoreItem) => ({
          name: skill.dimension,
          score: skill.score,
          emoji: getScoreEmoji(skill.score), 
          feedback: skill.feedback ? {
            strengths: skill.feedback.strengths || [],
            weaknesses: skill.feedback.weaknesses || [],
            exemplar_response_suggestion: skill.feedback.exemplar_response_suggestion,
          } : undefined,
        })) || [],
        summary: scoreData.llmResponse?.summary_feedback || 'No summary provided.',
        sessionLink: `${appUrl}/results/${sessionIdFromQuery}`,
      };
      logger.info({event: 'PreviewEmailDataFetched', details: { sessionId: sessionIdFromQuery }});
    } catch (error: any) {
      logger.error({event: 'PreviewEmailDataFetchError', details: { sessionId: sessionIdFromQuery }, message: error.message, error: error});
      reportData = {
        recommendation: "Error Loading Data for Preview",
        date: new Date().toLocaleDateString(),
        interviewType: "Data Fetch Error",
        skills: [],
        summary: `Could not load data for session ${sessionIdFromQuery} for preview. Error: ${error.message}`,
        sessionLink: "#", // Or use appUrl for consistency: `${appUrl}/results/error-preview`
      };
    }
  } else {
    logger.info({event: 'PreviewEmailUsingMockData'});
    reportData = {
      recommendation: "Hire (Mock Data)",
      date: new Date().toLocaleDateString(),
      interviewType: "Product Design Mock Interview",
      skills: [
        { name: "User Empathy", score: 4, emoji: "👥", feedback: { strengths: ["Great active listening"], weaknesses: [], exemplar_response_suggestion: "Keep it up!" } },
        { name: "Visual Design", score: 3, emoji: "🎨", feedback: { strengths: ["Good use of color"], weaknesses: ["Typography could improve"] } },
        { name: "Prototyping", score: null, emoji: "⚙️" }, 
      ],
      summary: "This is mock summary data. The candidate showed strong user empathy.",
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