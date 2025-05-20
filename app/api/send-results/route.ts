import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { type InterviewData } from '../../../lib/types/email';
import { createSimpleEmailHtml } from '../../../lib/emailUtils'; // Import the centralized helper

// Interface for the expected structure of interview report data
// ... (InterviewData interface was here)

const resendApiKey = process.env.RESEND_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'Loopie <onboarding@resend.dev>';

let resend: Resend | null = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
} else {
  console.warn(
    'RESEND_API_KEY is not set. Email sending will be disabled. ' +
    'Please set this environment variable if you wish to send emails.'
  );
}

// Helper to build a simple HTML string for the email
// NOTE: This HTML is manually constructed due to JSX/TSX render issues in server routes.
// When JSX support is resolved, switch to rendering the InterviewResultsEmail React component (e.g., using react-dom/server or @react-email/render).

export async function POST(request: NextRequest) {
  if (!resend) {
    console.error('Resend client is not initialized. RESEND_API_KEY might be missing.');
    return NextResponse.json(
      { error: 'Email service is not configured on the server.' }, 
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { email, userName, interviewReportData } = body as { 
      email: string; 
      userName?: string; 
      interviewReportData: InterviewData; 
    };

    if (!email || !interviewReportData) {
      return NextResponse.json(
        { error: 'Recipient email and interview report data are required.' }, 
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

    const subject = "Your Loopie interview feedback - where you shined & what to work on💡";

    const emailHtml = createSimpleEmailHtml(userName, interviewReportData);
    
    const { data, error: resendError } = await resend.emails.send({
      from: SENDER_EMAIL,
      to: [email],
      subject: subject,
      html: emailHtml,
    });

    if (resendError) {
      console.error('Resend API Error:', resendError);
      return NextResponse.json(
        { error: 'Failed to send email.', details: resendError.message || 'Unknown Resend error' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Email sent successfully!', data }, { status: 200 });

  } catch (err: any) {
    console.error('API Route Error (send-results):', err);
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request body: Malformed JSON.'}, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal Server Error', details: err.message || 'An unknown error occurred' }, 
      { status: 500 }
    );
  }
} 