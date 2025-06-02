import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../lib/logger';

// Test endpoint to simulate ElevenLabs webhook
// Only available in development mode for security
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'This endpoint is only available in development mode' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    logger.info({ 
      event: 'TestWebhookTriggered', 
      details: { sessionId, endpoint: '/api/test-webhook' } 
    });

    // Create a mock webhook payload similar to what ElevenLabs sends
    const mockWebhookPayload = {
      webhook_meta: {
        event: 'call_ended',
        timestamp: new Date().toISOString()
      },
      conversation_id: sessionId, // Use the provided sessionId
      status: 'done',
      call_data: {
        end_reason: 'user_ended_call',
        call_status: 'done',
        duration: 300 // 5 minutes
      }
    };

    // Forward to the actual webhook endpoint
    const webhookResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/elevenlabs-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Skip signature verification in development by not including the signature header
      },
      body: JSON.stringify(mockWebhookPayload),
    });

    const webhookResult = await webhookResponse.json();

    logger.info({ 
      event: 'TestWebhookCompleted', 
      details: { 
        sessionId, 
        webhookStatus: webhookResponse.status, 
        webhookResult 
      } 
    });

    return NextResponse.json({
      success: true,
      sessionId,
      webhookStatus: webhookResponse.status,
      webhookResult
    }, { status: 200 });

  } catch (error: any) {
    logger.error({ 
      event: 'TestWebhookError', 
      message: 'Error during test webhook', 
      error: { message: error.message, stack: error.stack }
    });

    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 