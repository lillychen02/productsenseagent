import { NextRequest, NextResponse } from 'next/server';
import { processOneScoringJob } from '../../../lib/jobProcessor';
import { logger } from '../../../lib/logger';

// Test endpoint to manually trigger job processing
// Only available in development mode for security
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'This endpoint is only available in development mode' }, { status: 403 });
  }

  logger.info({ event: 'ManualJobProcessingTriggered', details: { endpoint: '/api/test-process-job' } });

  try {
    const result = await processOneScoringJob();
    
    logger.info({ 
      event: 'ManualJobProcessingResult', 
      details: { 
        status: result.status, 
        jobId: result.jobId, 
        sessionId: result.sessionId, 
        message: result.message 
      } 
    });

    return NextResponse.json({
      success: true,
      result: result
    }, { status: 200 });

  } catch (error: any) {
    logger.error({ 
      event: 'ManualJobProcessingError', 
      message: 'Error during manual job processing', 
      error: { message: error.message, stack: error.stack }
    });

    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 