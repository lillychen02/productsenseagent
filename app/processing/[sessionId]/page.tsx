'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { logger } from '../../../lib/logger'; // Assuming logger is in lib
import { type SessionStatus } from '../../../lib/types/session'; // Import shared status type

const POLLING_INTERVAL = 5000; // Poll every 5 seconds
const MAX_POLLING_ATTEMPTS = 36; // Max 3 minutes (36 * 5s = 180s)

interface StatusResponse {
  sessionId: string;
  status: SessionStatus;
  status_updated_at: Date;
  status_error?: string | null;
  rubricName?: string;
  interviewType?: string;
}

// Helper function to get user-friendly status message
const getFriendlyStatusMessage = (status: SessionStatus | null): string | null => {
  if (!status) return null;
  switch (status) {
    case 'started':
      return "Getting things ready...";
    case 'webhook_received':
    case 'webhook_received_not_scored':
      return "Received your interview transcript...";
    case 'scoring_enqueued':
      return "Preparing to score your interview...";
    case 'scoring_in_progress':
      return "Scoring your interview...";
    case 'scored_successfully':
      return "Completed your feedback! Redirecting..."; // User might briefly see this before redirect
    // Failure statuses will typically result in the errorMessage UI instead
    case 'scoring_enqueue_failed':
    case 'scoring_failed_llm':
    case 'scoring_failed_db':
      return "There was an issue preparing your feedback."; // Fallback if not caught by errorMessage
    default:
      // Handle the 'never' type case explicitly if necessary, or cast to string
      // If status can only be of SessionStatus type, this default might be for exhaustiveness 
      // but practically for unexpected string values that might sneak in if types are bypassed.
      const statusAsString: string = status; // Allows .replace
      return `Processing status: ${statusAsString.replace(/_/g, ' ')}`;
  }
};

export default function ProcessingPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [currentStatus, setCurrentStatus] = useState<SessionStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollingAttemptsRef = useRef(0);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    logger.info({ event: 'ProcessingPageMounted', details: { sessionId } });

    const fetchStatusAndDecide = async () => {
      if (pollingAttemptsRef.current >= MAX_POLLING_ATTEMPTS) {
        logger.warn({ event: 'ProcessingPagePollingMaxAttempts', details: { sessionId, attempts: pollingAttemptsRef.current }});
        setErrorMessage("We're still working on your results. Please check back in a few minutes on the results page, or contact support if this persists.");
        if (intervalIdRef.current) clearInterval(intervalIdRef.current);
        return;
      }

      pollingAttemptsRef.current += 1;
      try {
        const response = await fetch(`/api/session-status/${sessionId}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Failed to fetch session status."}));
          throw new Error(errorData.message || `Error fetching status: ${response.status}`);
        }
        const data: StatusResponse = await response.json();
        logger.info({ event: 'ProcessingPageStatusPoll', details: { sessionId, status: data.status, attempt: pollingAttemptsRef.current } });
        setCurrentStatus(data.status);

        if (data.status === 'scored_successfully') {
          logger.info({ event: 'ProcessingPageScoredSuccessfully', details: { sessionId } });
          if (intervalIdRef.current) clearInterval(intervalIdRef.current);
          router.push(`/results/${sessionId}`);
        } else if (['scoring_enqueue_failed', 'scoring_failed_llm', 'scoring_failed_db'].includes(data.status)) {
          logger.error({ event: 'ProcessingPageScoringFailed', details: { sessionId, status: data.status, error: data.status_error } });
          setErrorMessage(data.status_error || "An error occurred while processing your results. Please try again later or contact support.");
          if (intervalIdRef.current) clearInterval(intervalIdRef.current);
        } else {
          // Continue polling - interval is already running
        }
      } catch (error: any) {
        logger.error({ event: 'ProcessingPagePollError', details: { sessionId }, error });
        setErrorMessage("Could not retrieve processing status. Please try refreshing or contact support.");
        if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      }
    };

    // Perform initial fetch immediately
    fetchStatusAndDecide();

    // Set up the interval only if not already stopped by initial fetch AND no error AND not yet successful
    if (pollingAttemptsRef.current < MAX_POLLING_ATTEMPTS && !errorMessage && currentStatus !== 'scored_successfully') {
        intervalIdRef.current = setInterval(fetchStatusAndDecide, POLLING_INTERVAL);
    } else {
        // If conditions not met, ensure any existing interval is cleared
        if (intervalIdRef.current) {
            clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
        }
    }

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        logger.info({ event: 'ProcessingPageUnmounted', details: { sessionId, message: 'Polling stopped on unmount.' }});
      }
    };
  // Added currentStatus and errorMessage to dependency array
  }, [sessionId, router, currentStatus, errorMessage]); 

  const friendlyStatusMessage = getFriendlyStatusMessage(currentStatus);

  if (errorMessage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <div className="p-8 bg-transparent rounded-lg max-w-2xl w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Processing Error</h1>
          <p className="text-gray-700 mb-6">{errorMessage}</p>
          <button 
            onClick={() => router.push('/')} 
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
      <div className="p-10 bg-transparent rounded-lg max-w-2xl w-full">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3">
          We&apos;re preparing your feedback...
        </h1>
        <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-6">
          This takes ~30–60 seconds. You&apos;ll be redirected as soon as your results are ready.
        </p>
        <div className="mb-4"> 
          <svg className="animate-spin h-12 w-12 text-indigo-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        {friendlyStatusMessage && (
            <p className="mt-2 text-sm text-gray-500">{friendlyStatusMessage}</p>
        )}
      </div>
    </div>
  );
} 