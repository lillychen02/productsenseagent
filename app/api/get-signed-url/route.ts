import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Make sure environment variables are set
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.NEXT_PUBLIC_AGENT_ID;

    if (!apiKey || !agentId) {
      return NextResponse.json(
        { error: 'Missing API key or Agent ID in environment variables' },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get signed URL: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json({ signedUrl: data.signed_url });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate signed URL' },
      { status: 500 }
    );
  }
} 