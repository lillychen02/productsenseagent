import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { type InterviewData } from '../../../lib/types/email';
import { createSimpleEmailHtml } from '../../../lib/emailUtils'; // Import the centralized helper
import { logger } from '../../../lib/logger'; // Import refined logger
import { connectToDatabase } from '../../../lib/mongodb'; // For DB updates
import { type SessionMetadata, type EmailedResultLogEntry } from '../../../lib/types/session'; // Import relevant types

// Interface for the expected structure of interview report data
// ... (InterviewData interface was here)

const resendApiKey = process.env.RESEND_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'Loopie <onboarding@resend.dev>';

let resend: Resend | null = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
} else {
  logger.warn({event: 'ResendAPIKeyMissing', message: 'RESEND_API_KEY is not set. Email sending will be disabled.'});
}

// Helper to build a simple HTML string for the email
// NOTE: This HTML is manually constructed due to JSX/TSX render issues in server routes.
// When JSX support is resolved, switch to rendering the InterviewResultsEmail React component (e.g., using react-dom/server or @react-email/render).

export async function POST(request: NextRequest) {
  if (!resend) {
    logger.error({event: 'ResendClientNotInitialized', message: 'Attempted to send email, but Resend client not initialized.'});
    return NextResponse.json(
      { error: 'Email service is not configured on the server.' }, 
      { status: 503 }
    );
  }

  let emailForErrorLog: string | undefined;
  let sessionIdForErrorLog: string | undefined;

  try {
    const body = await request.json();
    const { email, userName, interviewReportData, sessionId } = body as { 
      email: string; 
      userName?: string; 
      interviewReportData: InterviewData; 
      sessionId: string; // Expect sessionId in the request body
    };
    emailForErrorLog = email;
    sessionIdForErrorLog = sessionId; 

    logger.info({event: 'SendResultsRequestReceived', details: { email, userNamePresent: !!userName, sessionId }});

    if (!email || !interviewReportData || !sessionId) {
      logger.warn({event: 'SendResultsValidationError', details: { email, sessionId }, message: 'Recipient email, interview report data, or sessionId is missing.'});
      return NextResponse.json(
        { error: 'Recipient email, interview report data, and sessionId are required.' }, 
        { status: 400 }
      );
    }

    const requiredFields: (keyof InterviewData)[] = ['recommendation', 'date', 'interviewType', 'skills', 'summary'];
    for (const field of requiredFields) {
        if (field === 'skills') {
            if (!Array.isArray(interviewReportData[field])) {
                return NextResponse.json(
                    { error: `Interview report data field '${field}' must be an array.` }, 
                    { status: 400 }
                );
            }
        } else if (interviewReportData[field] === undefined || interviewReportData[field] === null || String(interviewReportData[field]).trim() === '') {
            return NextResponse.json(
                { error: `Interview report data is missing or has an invalid value for required field: '${field}'.` }, 
                { status: 400 }
            );
        }
    }

    // Store the email log attempt in sessions_metadata FIRST
    try {
      const { db } = await connectToDatabase();
      const newEmailLogEntry: EmailedResultLogEntry = {
        email: email,
        timestamp: new Date(),
      };
      const updateResult = await db.collection<SessionMetadata>('sessions_metadata').updateOne(
        { sessionId: sessionId },
        { 
          $push: { emailedResultsTo: newEmailLogEntry },
          $set: { updatedAt: new Date(), status_updated_at: new Date() } 
        }
      );
      if (updateResult.modifiedCount === 0 && updateResult.matchedCount === 0) {
        logger.warn({event: 'StoreEmailedToLogWarning', details: { sessionId, email }, message: 'Session metadata not found to store email log (attempt), or no changes made.'});
      } else {
        logger.info({event: 'StoreEmailedToLogAttemptSuccess', details: { sessionId, email }});
      }
    } catch (dbError: any) {
      logger.error({event: 'StoreEmailedToLogAttemptError', details: { sessionId, email }, message: 'Failed to store emailedTo log (attempt) in sessions_metadata.', error: dbError });
      // Decide if this failure should prevent email sending. For now, we'll proceed to send the email.
    }

    const subject = "Your Loopie Interview Feedback - What's Next";
    const emailHtml = createSimpleEmailHtml(userName, interviewReportData);
    
    logger.info({event: 'SendingEmailAttempt', details: { to: email, subject, sessionId }});
    const { data: resendResponseData, error: resendError } = await resend!.emails.send({
      from: SENDER_EMAIL,
      to: [email],
      subject: subject,
      html: emailHtml,
    });

    if (resendError) {
      logger.error({event: 'ResendAPIError', details: { email, subject, sessionId }, message: resendError.message, error: resendError });
      // NOTE: Email log attempt was already made. No further DB update here for this simple model.
      return NextResponse.json(
        { error: 'Failed to send email.', details: resendError.message || 'Unknown Resend error' }, 
        { status: 500 }
      );
    }

    logger.info({event: 'EmailSentSuccessfully', details: { email, subject, sessionId, resendMessageId: resendResponseData?.id }});
    // NOTE: Email log attempt was already made. If we wanted to update its status to 'sent',
    // we'd need more complex logic to find and update the specific EmailedResultLogEntry.

    return NextResponse.json({ message: 'Email sent successfully!', data: resendResponseData }, { status: 200 });

  } catch (err: any) {
    const errorMessage = err.message || 'An unknown error occurred';
    logger.error({ 
      event: 'SendResultsUnhandledError', 
      details: { email: emailForErrorLog, sessionId: sessionIdForErrorLog }, 
      message: errorMessage, 
      error: err 
    });
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request body: Malformed JSON.'}, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage }, 
      { status: 500 }
    );
  }
} 