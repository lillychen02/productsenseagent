import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb'; // Adjust path based on actual location
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../../lib/logger'; // Adjust path
import { SessionMetadata, SessionStatus } from '../../../../lib/types/session'; // Adjust path

// Default values for Product Sense interview
const DEFAULT_PRODUCT_SENSE_RUBRIC_ID = '681e7b94bed6ffb4a14f3e1f';
const DEFAULT_PRODUCT_SENSE_INTERVIEW_TYPE = 'Product Sense';

// Basic email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const baseLogPayload = {
    handler: 'POST /api/sessions/start',
    // sessionIdGenerated will be added later if successful
  };

  try {
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (e) {
      logger.warn({ ...baseLogPayload, event: 'RequestBodyParseError', details: { error: (e as Error).message }, message: 'Failed to parse request body as JSON.' });
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const {
      email,
      rubricId: reqRubricId,
      interviewType: reqInterviewType,
    } = requestBody as { email?: string; rubricId?: string; interviewType?: string };

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      logger.warn({ ...baseLogPayload, event: 'InvalidEmailFormat', details: { providedEmail: email }, message: 'Invalid or missing email.' });
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    const internalSessionId = uuidv4();
    const currentLogPayload = { ...baseLogPayload, sessionIdGenerated: internalSessionId, requestBody }; // Add sessionId and full body now

    const rubricIdToUse = reqRubricId || DEFAULT_PRODUCT_SENSE_RUBRIC_ID;
    const interviewTypeToUse = reqInterviewType || DEFAULT_PRODUCT_SENSE_INTERVIEW_TYPE;

    let mongoRubricId;
    try {
      mongoRubricId = new ObjectId(rubricIdToUse);
    } catch (error) {
      logger.warn({ ...currentLogPayload, event: 'InvalidRubricIdFormat', details: { providedRubricId: rubricIdToUse, error: (error as Error).message }, message: 'Invalid rubricId format.' });
      return NextResponse.json({ error: 'Invalid rubricId format. Must be a 24-character hex string.' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const now = new Date();

    const newSessionMetadata: Omit<SessionMetadata, '_id' | 'startTime'> & { startTime: Date } = {
      sessionId: internalSessionId,
      email: email,
      rubricId: mongoRubricId,
      rubricName: interviewTypeToUse, 
      interviewType: interviewTypeToUse,
      startTime: now, 
      status: 'session_initiated' as SessionStatus, 
      status_updated_at: now,
      updatedAt: now,
      results_email_sent: false, 
    };
    
    logger.info({ ...currentLogPayload, event: 'AttemptingToInsertSession', details: { sessionMetadataToInsert: newSessionMetadata }, message: 'Attempting to insert new session metadata.' });

    const result = await db.collection<SessionMetadata>('sessions_metadata').insertOne(newSessionMetadata as SessionMetadata);

    if (!result.insertedId) {
      logger.error({ ...currentLogPayload, event: 'SessionInsertFailedDB', details: { dbResult: result }, message: 'Failed to save session metadata to database.' });
      return NextResponse.json({ error: 'Failed to create session.' }, { status: 500 });
    }

    logger.info({ ...currentLogPayload, event: 'SessionInsertSuccess', details: { insertedId: result.insertedId.toHexString() }, message: 'Session metadata saved successfully.' });

    return NextResponse.json({ sessionId: internalSessionId }, { status: 201 });

  } catch (error: any) {
    // Log with baseLogPayload as internalSessionId might not be set if error is early
    logger.error({ ...baseLogPayload, event: 'UnhandledError', details: { errorMessage: error.message, stack: error.stack, errorObject: error }, message: 'An unexpected error occurred.'});
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 