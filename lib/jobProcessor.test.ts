import { processOneScoringJob } from './jobProcessor';
import { connectToDatabase } from './mongodb';
import { logger } from './logger';
import { executeScoring } from './scoringService';
import { sendResultsEmailAfterScoring } from './services/emailService';
import { ObjectId } from 'mongodb';
import { SessionMetadata, SessionStatus } from './types/session';
import { ScoringJob } from './types/jobs';

// --- Mocks ---
jest.mock('./mongodb');
jest.mock('./logger');
jest.mock('./scoringService');
jest.mock('./services/emailService');

const mockDb = {
  collection: jest.fn().mockReturnThis(),
  findOneAndUpdate: jest.fn(),
  findOne: jest.fn(),
  updateOne: jest.fn(),
};
(connectToDatabase as jest.Mock).mockResolvedValue({ db: mockDb });
(executeScoring as jest.Mock).mockResolvedValue({ _id: new ObjectId(), /* mock StoredScore object */ });
(sendResultsEmailAfterScoring as jest.Mock).mockResolvedValue(true);

describe('processOneScoringJob - Email Sending Logic', () => {
  let mockPendingJob: ScoringJob;
  let mockSessionMetadata: SessionMetadata;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPendingJob = {
      _id: new ObjectId(),
      sessionId: 'test-session-for-email',
      rubricId: 'rubric-123',
      status: 'pending',
      attempts: 0,
      created_at: new Date(),
      updated_at: new Date(),
    } as ScoringJob;

    mockSessionMetadata = {
      _id: new ObjectId(),
      sessionId: 'test-session-for-email',
      email: 'testuser@example.com',
      rubricId: new ObjectId(),
      startTime: new Date(),
      status: 'scored_successfully' as SessionStatus,
      status_updated_at: new Date(),
      updatedAt: new Date(),
      results_email_sent: false,
    } as SessionMetadata;

    mockDb.findOneAndUpdate.mockResolvedValue(mockPendingJob);
    mockDb.updateOne.mockResolvedValue({ modifiedCount: 1, matchedCount: 1 });
    mockDb.findOne.mockImplementation((query) => {
      if (query.sessionId === mockPendingJob.sessionId) {
        return Promise.resolve(mockSessionMetadata);
      }
      return Promise.resolve(null);
    });
    (executeScoring as jest.Mock).mockResolvedValue({ _id: new ObjectId(), /* other score fields */ });
    (sendResultsEmailAfterScoring as jest.Mock).mockResolvedValue(true);
  });

  it('should attempt to send an email if scoring is successful, email exists, and not yet sent', async () => {
    await processOneScoringJob();

    expect(executeScoring).toHaveBeenCalledWith(mockPendingJob.sessionId, mockPendingJob.rubricId);
    expect(mockDb.findOne).toHaveBeenCalledWith({ sessionId: mockPendingJob.sessionId });
    expect(sendResultsEmailAfterScoring).toHaveBeenCalledWith(mockPendingJob.sessionId, mockSessionMetadata.email);
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: 'AttemptingToSendResultsEmailPostScoring' }));
  });

  it('should update results_email_sent flag in sessions_metadata if email is sent successfully', async () => {
    (sendResultsEmailAfterScoring as jest.Mock).mockResolvedValue(true);

    await processOneScoringJob();

    expect(sendResultsEmailAfterScoring).toHaveBeenCalledTimes(1);
    const sessionsMetadataUpdateCall = mockDb.updateOne.mock.calls.find(call =>
      call[0].sessionId === mockPendingJob.sessionId && call[1].$set && call[1].$set.results_email_sent === true
    );
    expect(sessionsMetadataUpdateCall).toBeDefined();
    if (sessionsMetadataUpdateCall) {
        expect(sessionsMetadataUpdateCall[1].$set.updatedAt).toBeInstanceOf(Date);
    }
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: 'ResultsEmailSentSuccessfullyPostScoring' }));
  });

  it('should log a warning if sendResultsEmailAfterScoring returns false', async () => {
    (sendResultsEmailAfterScoring as jest.Mock).mockResolvedValue(false);

    await processOneScoringJob();

    expect(sendResultsEmailAfterScoring).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({
      event: 'ResultsEmailSendFailedPostScoring',
      message: 'sendResultsEmailAfterScoring returned false.',
    }));
    const sessionsMetadataUpdateCallForEmailSent = mockDb.updateOne.mock.calls.find(call =>
        call[0].sessionId === mockPendingJob.sessionId && call[1].$set && call[1].$set.results_email_sent === true
      );
    expect(sessionsMetadataUpdateCallForEmailSent).toBeUndefined();
  });

  it('should log a warning if no email is found in session metadata', async () => {
    mockSessionMetadata.email = undefined;
    mockDb.findOne.mockResolvedValue(mockSessionMetadata);

    await processOneScoringJob();

    expect(sendResultsEmailAfterScoring).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({
      event: 'NoEmailForResultsPostScoring',
      message: 'No email found in session metadata to send results.',
    }));
  });

  it('should log info and skip sending if results_email_sent is already true', async () => {
    mockSessionMetadata.results_email_sent = true;
    mockDb.findOne.mockResolvedValue(mockSessionMetadata);

    await processOneScoringJob();

    expect(sendResultsEmailAfterScoring).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({
      event: 'ResultsEmailAlreadySentSkipping',
    }));
  });
  
  it('should log an error if fetching session metadata for email fails, but still complete the job', async () => {
    const dbError = new Error("Failed to fetch session metadata for email");
    const originalFindOne = mockDb.findOne;
    mockDb.findOne = jest.fn((query) => {
      if (query.sessionId === mockPendingJob.sessionId && mockDb.collection.mock.calls.some(call => call[0] === 'sessions_metadata')) {
        const lastCollectionCall = mockDb.collection.mock.calls[mockDb.collection.mock.calls.length -1];
        if(lastCollectionCall && lastCollectionCall[0] === 'sessions_metadata'){
            return Promise.reject(dbError);
        }
      }
      return originalFindOne(query);
    });

    mockDb.findOneAndUpdate.mockResolvedValue(mockPendingJob);

    const result = await processOneScoringJob();

    expect(sendResultsEmailAfterScoring).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({
      event: 'ErrorDuringEmailSendingLogicPostScoring',
      details: expect.objectContaining({ error: dbError.message }),
    }));
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: 'ScoringJobCompleted' }));
    expect(result.status).toBe('completed');
    mockDb.findOne = originalFindOne;
  });
  
  it('should log an error if sendResultsEmailAfterScoring throws an unexpected error, but still complete the job', async () => {
    const emailServiceError = new Error("Unexpected error in email service");
    (sendResultsEmailAfterScoring as jest.Mock).mockRejectedValue(emailServiceError);

    const result = await processOneScoringJob();

    expect(sendResultsEmailAfterScoring).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({
      event: 'ErrorDuringEmailSendingLogicPostScoring',
      details: expect.objectContaining({ error: emailServiceError.message }),
    }));
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: 'ScoringJobCompleted' }));
    expect(result.status).toBe('completed');
  });

  it('should return no_jobs if findOneAndUpdate returns no job', async () => {
    mockDb.findOneAndUpdate.mockResolvedValue(null);
    const result = await processOneScoringJob();
    expect(result.status).toBe('no_jobs');
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ event: 'ProcessOneScoringJobNoPendingJobs' }));
  });

}); 