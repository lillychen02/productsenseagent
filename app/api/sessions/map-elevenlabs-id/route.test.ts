import { POST } from './route'; // Assuming route.ts is in the same directory
import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb';
import { logger } from '../../../../lib/logger';
import { SessionMetadata } from '../../../../lib/types/session';
import { ObjectId } from 'mongodb';


// --- Mocks ---
jest.mock('../../../../lib/mongodb');
jest.mock('../../../../lib/logger');

const mockDb = {
  collection: jest.fn().mockReturnThis(),
  findOneAndUpdate: jest.fn(),
};
(connectToDatabase as jest.Mock).mockResolvedValue({ db: mockDb });

// Helper to create a mock NextRequest
const createMockRequest = (body: any, method: string = 'POST') => {
  return {
    json: jest.fn().mockResolvedValue(body),
    method: method,
    headers: new Headers(),
    url: 'http://localhost/api/sessions/map-elevenlabs-id',
  } as unknown as NextRequest;
};

describe('POST /api/sessions/map-elevenlabs-id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully map elevenlabsConversationId to a session', async () => {
    const testSessionId = 'test-internal-uuid-123';
    const testElevenLabsId = 'elevenlabs-conv-abc789';
    const mockUpdatedSession: SessionMetadata = {
      _id: new ObjectId(),
      sessionId: testSessionId,
      rubricId: new ObjectId(),
      startTime: new Date(),
      status: 'session_initiated', // Or whatever status it might be in
      status_updated_at: new Date(),
      updatedAt: new Date(),
      elevenlabsConversationId: testElevenLabsId, // The updated field
      email: 'test@example.com',
      results_email_sent: false,
    };
    mockDb.findOneAndUpdate.mockResolvedValue(mockUpdatedSession); // Simulate successful update

    const request = createMockRequest({
      sessionId: testSessionId,
      elevenlabsConversationId: testElevenLabsId,
    });
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.message).toBe('ElevenLabs ID mapped successfully');
    expect(responseBody.session.elevenlabsConversationId).toBe(testElevenLabsId);
    expect(mockDb.collection).toHaveBeenCalledWith('sessions_metadata');
    expect(mockDb.findOneAndUpdate).toHaveBeenCalledWith(
      { sessionId: testSessionId },
      {
        $set: expect.objectContaining({
          elevenlabsConversationId: testElevenLabsId,
          updatedAt: expect.any(Date),
          status_updated_at: expect.any(Date),
        }),
      },
      expect.anything() // For options object
    );
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: 'SessionUpdateSuccessForMapping' }));
  });

  it('should return 400 if sessionId is missing', async () => {
    const request = createMockRequest({ elevenlabsConversationId: 'elevenlabs-id' });
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toBe('Missing or invalid sessionId');
    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'InvalidSessionId' }));
  });

  it('should return 400 if elevenlabsConversationId is missing', async () => {
    const request = createMockRequest({ sessionId: 'internal-id' });
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toBe('Missing or invalid elevenlabsConversationId');
    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'InvalidElevenLabsId' }));
  });
  
  it('should return 400 if request body is not valid JSON', async () => {
    const request = {
      json: jest.fn().mockRejectedValue(new SyntaxError("Unexpected token B in JSON at position 0")),
      method: 'POST',
      headers: new Headers(),
      url: 'http://localhost/api/sessions/map-elevenlabs-id',
    } as unknown as NextRequest;
    
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toBe('Invalid JSON in request body');
    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'RequestBodyParseError' }));
  });


  it('should return 404 if session is not found for the given sessionId', async () => {
    mockDb.findOneAndUpdate.mockResolvedValue(null); // Simulate session not found

    const request = createMockRequest({
      sessionId: 'non-existent-session-id',
      elevenlabsConversationId: 'elevenlabs-id',
    });
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(404);
    expect(responseBody.error).toBe('Session not found');
    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'SessionNotFoundForMapping' }));
  });

  it('should return 500 for an unexpected error during database operation', async () => {
    mockDb.findOneAndUpdate.mockRejectedValue(new Error("DB update failed unexpectedly"));

    const request = createMockRequest({
      sessionId: 'test-session-id',
      elevenlabsConversationId: 'elevenlabs-id',
    });
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBe('Internal Server Error');
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ event: 'UnhandledError' }));
  });
}); 