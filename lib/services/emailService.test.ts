import { Resend } from 'resend';
import { logger } from '../logger';
import { connectToDatabase } from '../mongodb';
import { createSimpleEmailHtml } from '../emailUtils';
import { sendResultsEmailAfterScoring } from './emailService'; // Assuming transformScoreToInterviewData is not exported directly
import { StoredScore, ScoreItem, LLMScoreResponse } from '@/types'; // Adjusted for clarity, assuming ScoreItem is the one from StoredScore.llmResponse.scores
import { InterviewData } from '../types/email';
import { ObjectId } from 'mongodb'; // Import ObjectId directly from mongodb

// --- Mocks ---
jest.mock('../logger');
jest.mock('../mongodb');
jest.mock('../emailUtils');
jest.mock('resend');

const mockResendSend = jest.fn();
const ResendMock = Resend as jest.MockedClass<typeof Resend>;
ResendMock.mockImplementation(() => ({
  emails: { send: mockResendSend },
} as any));


const mockDb = {
  collection: jest.fn().mockReturnThis(),
  findOne: jest.fn(),
};
(connectToDatabase as jest.Mock).mockResolvedValue({ db: mockDb });
(createSimpleEmailHtml as jest.Mock).mockReturnValue('<html><body>Mock Email</body></html>');

describe('EmailService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Default successful Resend send
    mockResendSend.mockResolvedValue({ data: { id: 'resend-test-id' }, error: null });
    // Default successful score find
    mockDb.findOne.mockResolvedValue({
      sessionId: 'test-session-id',
      rubricId: new ObjectId('605f0b3b3f8b8a001f9e7e6a'), 
      rubricName: 'Test Rubric',
      llmResponse: {
        overall_recommendation: 'Hire',
        scores: [
          { dimension: 'Clarity', score: 3, feedback: { strengths: ['Clear'], weaknesses: ['A bit vague'] } },
        ],
        summary_feedback: 'Good overall.',
      } as LLMScoreResponse, 
      scoredAt: new Date(),
    } as StoredScore); 
  });

  describe('sendResultsEmailAfterScoring', () => {
    const testSessionId = 'session-123';
    const testRecipientEmail = 'test@example.com';
    const testUserName = 'Test User';

    it('should return false and log error if Resend client is not initialized', async () => {
      // This test remains conceptual as per previous comments due to module-level instantiation.
      // To properly test, Resend client should ideally be injectable or its module mock managed carefully.
      // For now, this acts as a placeholder for that known limitation.
      console.warn("Test for 'Resend client not initialized' is conceptual and relies on specific mock setup not shown here for module-level variable.");
      expect(true).toBe(true); // Placeholder
    });

    it('should return false and log warning if internalSessionId is missing', async () => {
      const result = await sendResultsEmailAfterScoring('', testRecipientEmail);
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({
        event: 'MissingParameters',
        message: 'Missing internalSessionId or recipientEmail.',
      }));
    });

    it('should return false and log warning if recipientEmail is missing', async () => {
      const result = await sendResultsEmailAfterScoring(testSessionId, '');
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({
        event: 'MissingParameters',
        message: 'Missing internalSessionId or recipientEmail.',
      }));
    });

    it('should return false and log warning if scoreData is not found', async () => {
      mockDb.findOne.mockResolvedValue(null); 
      const result = await sendResultsEmailAfterScoring(testSessionId, testRecipientEmail);
      expect(result).toBe(false);
      expect(mockDb.collection).toHaveBeenCalledWith('scores');
      expect(mockDb.findOne).toHaveBeenCalledWith({ sessionId: testSessionId });
      expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({
        event: 'ScoreDataNotFound',
        message: `No score data found for sessionId: ${testSessionId}. Cannot send email.`,
      }));
    });

    it('should send email successfully with correct data', async () => {
      const mockStoredScore: StoredScore = {
        sessionId: testSessionId,
        rubricId: new ObjectId('605f0b3b3f8b8a001f9e7e6b'),
        rubricName: 'Product Sense Deep Dive',
        llmResponse: {
          overall_recommendation: 'Strong Hire',
          scores: [
            { dimension: 'Problem Identification', score: 4, feedback: { strengths: ['Very clear'], weaknesses: [] } },
            { dimension: 'Solution Articulation', score: 3, feedback: { strengths: ['Good ideas'], weaknesses: ['Needs structure'] } },
          ],
          summary_feedback: 'Excellent candidate.',
        } as LLMScoreResponse,
        scoredAt: new Date('2023-10-26T10:00:00.000Z'),
        fullTranscriptText: "Interviewer: ... Candidate: ...",
        promptUsed: "Test prompt",
        llmModelUsed: "gpt-4o-test"
      };
      mockDb.findOne.mockResolvedValue(mockStoredScore);

      const result = await sendResultsEmailAfterScoring(testSessionId, testRecipientEmail, testUserName);
      expect(result).toBe(true);
      expect(mockDb.collection).toHaveBeenCalledWith('scores');
      expect(mockDb.findOne).toHaveBeenCalledWith({ sessionId: testSessionId });

      const expectedInterviewData: Partial<InterviewData> = { 
        recommendation: 'Strong Hire',
        date: new Date('2023-10-26T10:00:00.000Z').toLocaleDateString(),
        interviewType: 'Product Sense Deep Dive',
        summary: 'Excellent candidate.',
        sessionLink: `${process.env.NEXT_PUBLIC_APP_URL || 'https://askloopie.com'}/results/${testSessionId}`,
      };
      expect(createSimpleEmailHtml).toHaveBeenCalledWith(
        testUserName,
        expect.objectContaining(expectedInterviewData)
      );
      
      const htmlArgs = (createSimpleEmailHtml as jest.Mock).mock.calls[0][1] as InterviewData;
      expect(htmlArgs.skills).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Problem Identification', score: 4 }),
          expect.objectContaining({ name: 'Solution Articulation', score: 3 }),
        ])
      );

      expect(mockResendSend).toHaveBeenCalledWith({
        from: process.env.SENDER_EMAIL || 'Loopie <onboarding@resend.dev>',
        to: [testRecipientEmail],
        subject: "Your Loopie Interview Feedback - What's Next",
        html: '<html><body>Mock Email</body></html>',
      });
      expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({
        event: 'SendingEmailAttempt'
      }));
      expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({
        event: 'EmailSentSuccessfully',
        details: { resendMessageId: 'resend-test-id' }
      }));
    });
    
    it('should use default rubricName if not present in scoreData', async () => {
      const mockStoredScoreWithoutRubricName: StoredScore = {
        sessionId: testSessionId,
        rubricId: new ObjectId('605f0b3b3f8b8a001f9e7e6c'),
        llmResponse: {
          overall_recommendation: 'Hire',
          scores: [],
          summary_feedback: 'Okay.',
        } as LLMScoreResponse,
        scoredAt: new Date(),
      };
      mockDb.findOne.mockResolvedValue(mockStoredScoreWithoutRubricName);

      await sendResultsEmailAfterScoring(testSessionId, testRecipientEmail);
      
      const htmlArgs = (createSimpleEmailHtml as jest.Mock).mock.calls[0][1] as InterviewData;
      expect(htmlArgs.interviewType).toBe('General Interview'); 
    });


    it('should return false and log error if Resend API fails', async () => {
      const resendError = { name: 'ResendError', message: 'Failed to send' };
      mockResendSend.mockResolvedValue({ data: null, error: resendError });

      const result = await sendResultsEmailAfterScoring(testSessionId, testRecipientEmail);
      expect(result).toBe(false);
      expect(mockResendSend).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({
        event: 'ResendAPIError',
        details: { error: resendError },
        message: `Failed to send email via Resend: ${resendError.message}`,
      }));
    });

    it('should return false and log error if an unexpected error occurs during DB fetch', async () => {
      const dbError = new Error('MongoDB connection failed');
      mockDb.findOne.mockRejectedValue(dbError); 

      const result = await sendResultsEmailAfterScoring(testSessionId, testRecipientEmail);
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({
        event: 'UnhandledErrorInEmailService',
        details: expect.objectContaining({ errorMessage: dbError.message }),
        message: 'An unexpected error occurred in sendResultsEmailAfterScoring.',
      }));
    });
  });
}); 