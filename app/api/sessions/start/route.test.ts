import { POST } from './route'; // Assuming route.ts is in the same directory
import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb';
import { logger } from '../../../../lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';

// --- Mocks ---
jest.mock('../../../../lib/mongodb');
jest.mock('../../../../lib/logger');
jest.mock('uuid');

const mockDb = {
  collection: jest.fn().mockReturnThis(),
  insertOne: jest.fn(),
};
(connectToDatabase as jest.Mock).mockResolvedValue({ db: mockDb });
(uuidv4 as jest.Mock).mockReturnValue('test-uuid-1234');


// Helper to create a mock NextRequest
const createMockRequest = (body: any, method: string = 'POST') => {
  return {
    json: jest.fn().mockResolvedValue(body),
    method: method,
    headers: new Headers(),
    url: 'http://localhost/api/sessions/start',
    // Add other NextRequest properties if your handler uses them
  } as unknown as NextRequest;
};


describe('POST /api/sessions/start', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default successful DB insert
    mockDb.insertOne.mockResolvedValue({ insertedId: new ObjectId('605f0b3b3f8b8a001f9e7e6c') });
  });

  it('should create a new session and return sessionId for valid input', async () => {
    const mockEmail = 'test@example.com';
    const request = createMockRequest({ email: mockEmail });
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(201);
    expect(responseBody.sessionId).toBe('test-uuid-1234');
    expect(connectToDatabase).toHaveBeenCalledTimes(1);
    expect(mockDb.collection).toHaveBeenCalledWith('sessions_metadata');
    expect(mockDb.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'test-uuid-1234',
        email: mockEmail,
        status: 'session_initiated',
        rubricId: expect.any(ObjectId), // Check that it's an ObjectId
        interviewType: 'Product Sense', // Default
        results_email_sent: false,
      })
    );
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: 'SessionInsertSuccess' }));
  });

  it('should use provided rubricId and interviewType if present', async () => {
    const mockEmail = 'test@example.com';
    const customRubricId = '605f0b3b3f8b8a001f9e7e6d'; // Valid ObjectId string
    const customInterviewType = 'Custom Interview';
    const request = createMockRequest({
      email: mockEmail,
      rubricId: customRubricId,
      interviewType: customInterviewType,
    });

    await POST(request);

    expect(mockDb.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        email: mockEmail,
        rubricId: new ObjectId(customRubricId),
        interviewType: customInterviewType,
      })
    );
  });

  it('should return 400 if email is missing', async () => {
    const request = createMockRequest({}); // No email
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toBe('Valid email is required.');
    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'InvalidEmailFormat' }));
  });

  it('should return 400 if email format is invalid', async () => {
    const request = createMockRequest({ email: 'invalid-email' });
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toBe('Valid email is required.');
    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'InvalidEmailFormat' }));
  });
  
  it('should return 400 if request body is not valid JSON', async () => {
    const request = { // Not a proper NextRequest, simulate json() failing
      json: jest.fn().mockRejectedValue(new SyntaxError("Unexpected token T in JSON at position 0")),
      method: 'POST',
      headers: new Headers(),
      url: 'http://localhost/api/sessions/start',
    } as unknown as NextRequest;
    
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toBe('Invalid JSON in request body');
    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'RequestBodyParseError' }));
  });


  it('should return 400 if rubricId format is invalid', async () => {
    const request = createMockRequest({
      email: 'test@example.com',
      rubricId: 'invalid-object-id',
    });
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toBe('Invalid rubricId format. Must be a 24-character hex string.');
    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'InvalidRubricIdFormat' }));
  });

  it('should return 500 if database insertion fails', async () => {
    mockDb.insertOne.mockResolvedValue({ insertedId: null }); // Simulate DB failure
    const request = createMockRequest({ email: 'test@example.com' });
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBe('Failed to create session.');
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ event: 'SessionInsertFailedDB' }));
  });
  
  it('should return 500 for an unexpected error during processing', async () => {
    (connectToDatabase as jest.Mock).mockRejectedValueOnce(new Error("Unexpected DB connection error"));
    const request = createMockRequest({ email: 'test@example.com' });
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBe('Internal Server Error');
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ event: 'UnhandledError' }));
  });
}); 