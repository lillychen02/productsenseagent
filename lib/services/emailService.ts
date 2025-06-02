import { Resend } from 'resend';
import { logger } from '../logger';
import { connectToDatabase } from '../mongodb';
import { type InterviewData, type SkillFeedback as EmailReportSkillFeedbackDetails } from '../types/email'; // Renamed alias for clarity
import { createSimpleEmailHtml } from '../emailUtils';
import { StoredScore, ScoreItem as StoredScoreItem } from '@/types'; // Using path alias
// import { SessionMetadata } from '../types/session'; // If needed for userName, but userEmail is primary

const resendApiKey = process.env.RESEND_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'Loopie <onboarding@resend.dev>';

let resend: Resend | null = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
} else {
  logger.warn({ event: 'EmailServiceResendAPIKeyMissing', message: 'RESEND_API_KEY is not set. Email sending will be disabled in EmailService.' });
}

// Type for one skill item within InterviewData.skills array
interface InterviewDataSkillItem {
  name: string;
  score: number | null;
  emoji: string;
  feedback?: EmailReportSkillFeedbackDetails; // This is the strengths, weaknesses part
}

/**
 * Transforms StoredScore data into InterviewData format for email.
 */
const transformScoreToInterviewData = (
  scoreData: StoredScore,
  internalSessionId: string
): InterviewData => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://askloopie.com';

  // Helper to get emoji based on score (assuming similar logic as in results page)
  const getScoreEmoji = (score: number | null): string => {
    if (score === null) return '🤔'; // Or some other default
    if (score >= 3.5) return '🎉'; 
    if (score >= 3) return '😊';
    if (score >= 2) return '😐';
    return '😟'; 
  };

  const transformedSkills: InterviewDataSkillItem[] = scoreData.llmResponse?.scores?.map(
    (skill: StoredScoreItem): InterviewDataSkillItem => ({
      name: skill.dimension, // This maps to InterviewDataSkillItem.name
      score: skill.score,
      emoji: getScoreEmoji(skill.score),
      feedback: { // This is the EmailReportSkillFeedbackDetails part
        strengths: skill.feedback?.strengths || [],
        weaknesses: skill.feedback?.weaknesses || [],
        exemplar_response_suggestion: skill.feedback?.exemplar_response_suggestion,
      },
    })
  ) || [];

  return {
    recommendation: scoreData.llmResponse?.overall_recommendation || 'N/A',
    date: new Date(scoreData.scoredAt).toLocaleDateString(),
    interviewType: scoreData.rubricName || 'General Interview',
    skills: transformedSkills, // Use the correctly typed and structured array
    summary: scoreData.llmResponse?.summary_feedback || 'No summary provided.',
    sessionLink: `${appUrl}/results/${internalSessionId}`,
  };
};

/**
 * Sends the interview results email after scoring is complete.
 * This function is intended to be called by a backend process (e.g., job processor).
 * @param internalSessionId The internal session ID (UUID) for which to send results.
 * @param recipientEmail The email address of the user who should receive the results.
 * @returns {Promise<boolean>} True if the email was sent successfully, false otherwise.
 */
export async function sendResultsEmailAfterScoring(
  internalSessionId: string,
  recipientEmail: string,
  userName?: string // Optional: if we want to personalize with a name from SessionMetadata later
): Promise<boolean> {
  const logContext = { 
    eventPrefix: 'SendResultsEmailAfterScoring', 
    sessionId: internalSessionId, 
    recipientEmail 
  };

  if (!resend) {
    logger.error({ ...logContext, event: 'ResendClientNotInitialized', message: 'Resend client not initialized in EmailService. Cannot send email.' });
    return false;
  }

  if (!internalSessionId || !recipientEmail) {
    logger.warn({ ...logContext, event: 'MissingParameters', message: 'Missing internalSessionId or recipientEmail.' });
    return false;
  }

  try {
    const { db } = await connectToDatabase();
    const scoreData = await db.collection<StoredScore>('scores').findOne({ sessionId: internalSessionId });

    if (!scoreData) {
      logger.warn({ ...logContext, event: 'ScoreDataNotFound', message: `No score data found for sessionId: ${internalSessionId}. Cannot send email.` });
      return false;
    }

    // Optional: Fetch SessionMetadata if userName is needed for personalization
    // const sessionInfo = await db.collection<SessionMetadata>('sessions_metadata').findOne({ sessionId: internalSessionId });
    // const userNameForEmail = sessionInfo?.userName; // Or derive from email if appropriate

    const interviewDataForEmail = transformScoreToInterviewData(scoreData, internalSessionId);
    const emailHtml = createSimpleEmailHtml(userName, interviewDataForEmail); // Pass userName if fetched
    const subject = "Your Loopie Interview Feedback - What's Next";

    logger.info({ ...logContext, event: 'SendingEmailAttempt', details: { subject } });

    const { data: resendResponseData, error: resendError } = await resend.emails.send({
      from: SENDER_EMAIL,
      to: [recipientEmail],
      subject: subject,
      html: emailHtml,
    });

    if (resendError) {
      logger.error({ ...logContext, event: 'ResendAPIError', details: { error: resendError }, message: `Failed to send email via Resend: ${resendError.message}` });
      return false;
    }

    logger.info({ ...logContext, event: 'EmailSentSuccessfully', details: { resendMessageId: resendResponseData?.id } });
    return true;

  } catch (error: any) {
    logger.error({ ...logContext, event: 'UnhandledErrorInEmailService', details: { errorMessage: error.message, stack: error.stack }, message: 'An unexpected error occurred in sendResultsEmailAfterScoring.' });
    return false;
  }
} 