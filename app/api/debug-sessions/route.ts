import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';
import { SessionMetadata } from '../../../lib/types/session';

// Debug endpoint to query sessions_metadata
// Only available in development mode for security
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'This endpoint is only available in development mode' }, { status: 403 });
  }

  try {
    const { db } = await connectToDatabase();
    const url = new URL(request.url);
    
    // Get query parameters
    const sessionId = url.searchParams.get('sessionId');
    const email = url.searchParams.get('email');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // Build query filter
    let filter: any = {};
    
    if (sessionId) {
      filter.sessionId = sessionId;
    }
    
    if (email) {
      filter.email = email;
    }
    
    if (status) {
      filter.status = status;
    }

    // Execute query
    const sessions = await db.collection<SessionMetadata>('sessions_metadata')
      .find(filter)
      .sort({ startTime: -1 })
      .limit(limit)
      .toArray();

    // Get collection stats
    const totalCount = await db.collection('sessions_metadata').countDocuments();
    const filteredCount = await db.collection('sessions_metadata').countDocuments(filter);

    return NextResponse.json({
      success: true,
      filter: filter,
      totalSessions: totalCount,
      filteredSessions: filteredCount,
      sessions: sessions.map(session => ({
        ...session,
        _id: session._id?.toString() // Convert ObjectId to string for JSON
      }))
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// POST endpoint to query with complex filters
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'This endpoint is only available in development mode' }, { status: 403 });
  }

  try {
    const { db } = await connectToDatabase();
    const body = await request.json();
    
    const { filter = {}, sort = { startTime: -1 }, limit = 10 } = body;

    const sessions = await db.collection<SessionMetadata>('sessions_metadata')
      .find(filter)
      .sort(sort)
      .limit(limit)
      .toArray();

    const totalCount = await db.collection('sessions_metadata').countDocuments(filter);

    return NextResponse.json({
      success: true,
      filter: filter,
      totalMatches: totalCount,
      sessions: sessions.map(session => ({
        ...session,
        _id: session._id?.toString()
      }))
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 