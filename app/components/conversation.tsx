'use client';

import { useConversation } from '@11labs/react';
import { useCallback, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Helper for timestamped logs
const logClient = (message: string, ...args: any[]) => {
  console.log(`[${new Date().toISOString()}] [CLIENT] ${message}`, ...args);
};

export function Conversation() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRubricLoading, setIsRubricLoading] = useState<boolean>(true);
  const [sessionId, setSessionId] = useState<string>('');
  const sessionIdRef = useRef<string>('');
  const [transcripts, setTranscripts] = useState<Array<{role: string, content: string}>>([]);
  
  // Timer state
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Scoring state
  const defaultRubricId = useRef<string | null>(null);
  const defaultRubricName = useRef<string | null>(null);
  const [isScoring, setIsScoring] = useState<boolean>(false);
  const [scoreResult, setScoreResult] = useState<any>(null); // Will be typed more specifically later

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    const fetchDefaultRubric = async () => {
      setIsRubricLoading(true);
      try {
        const response = await fetch('/api/rubrics');
        if (response.ok) {
          const data = await response.json();
          if (data.rubrics && data.rubrics.length > 0) {
            defaultRubricId.current = data.rubrics[0]._id;
            defaultRubricName.current = data.rubrics[0].name;
            console.log('Default rubric ID set:', defaultRubricId.current, 'Name:', defaultRubricName.current);
          } else { 
            console.warn('No rubrics found.');
            alert('Error: Could not load interview rubric. Please try refreshing.');
          }
        } else { 
            console.error('Failed to fetch rubrics.'); 
            alert('Error: Could not load interview rubric configuration. Please try refreshing.');
        }
      } catch (error) { 
        console.error('Error fetching rubric:', error); 
        alert('An error occurred while loading the interview rubric. Please try refreshing.');
      } finally {
        setIsRubricLoading(false);
      }
    };
    fetchDefaultRubric();
  }, []);

  // Timer effect to update elapsed time
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prevTime => prevTime + 1);
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Cleanup function
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isTimerRunning]);

  // Format elapsed time as mm:ss
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Function to save a message to the transcript API
  const saveTranscript = useCallback(async (role: string, content: string) => {
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) {
      console.warn('No ELI conversation_id (from ref) available for saving transcript.');
      return;
    }
    console.log('Saving transcript for ELI conversation_id (from ref):', { sessionId: currentSessionId, role, content });
    try {
      const response = await fetch('/api/transcripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId, role, content }),
      });
      
      if (!response.ok) {
        console.error('Failed to save transcript. Status:', response.status, await response.json().catch(()=>({})));
      } else {
        console.log('Transcript saved successfully:', await response.json());
      }
    } catch (error) {
      console.error('Failed to save transcript:', error);
    }
  }, []);

  // Function to handle session scoring (will be created next)
  const scoreCurrentSession = useCallback(async () => {
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) {
      console.error('No ELI conversation_id (from ref) available for scoring.');
      alert('Error: No session ID. Cannot score.');
      setIsScoring(false);
      return;
    }
    if (!defaultRubricId.current) {
      console.error('No default rubric ID for scoring.');
      alert('Error: Rubric not configured.');
      setIsScoring(false);
      return;
    }
    console.log(`Attempting to score ELI conversation_id ${currentSessionId} with rubric ${defaultRubricId.current}`);
    try {
      const response = await fetch('/api/score-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId, rubricId: defaultRubricId.current }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse scoring error." }));
        console.error('Scoring API call failed:', response.status, errorData);
        alert(`Error scoring: ${errorData.error || response.statusText}`);
        setIsScoring(false);
        return;
      }
      const result = await response.json();
      if (result.score) {
        alert('Session scored! Redirecting...');
        router.push(`/results/${currentSessionId}`);
      } else {
        alert('Scoring completed, but no score data was returned. Cannot redirect.');
        setIsScoring(false);
      }
    } catch (error) {
      alert(`Error scoring session: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsScoring(false);
    }
  }, [defaultRubricId, router]);

  const conversation = useConversation({
    onConnect: () => {
      logClient('ElevenLabs SDK: onConnect - Voice agent connected.');
      setIsTimerRunning(true);
      setScoreResult(null); // Clear scores on new session
    },
    onDisconnect: (reason: any) => {
      logClient('ElevenLabs SDK: onDisconnect - Voice agent disconnected.', reason || 'No specific reason provided by SDK.');
      setIsTimerRunning(false);
      if (!isScoring) {
        // alert("Interview disconnected."); // Or a more specific message based on context
      }
    },
    onMessage: (message) => {
      logClient('ElevenLabs SDK: onMessage - Received message.', message);
      const currentSessionIdFromRef = sessionIdRef.current;
      if ((message as any).type === "interruption") {
        const interruptionEvent = message as any;
        const reason = interruptionEvent.interruption_event?.reason || "Unknown interruption";
        logClient(`ElevenLabs SDK: Interruption occurred - Reason: ${reason}, SessionId: ${currentSessionIdFromRef}`);
        setIsTimerRunning(false);
        alert(`Session interrupted: ${reason}`);
        return;
      }
      if (message && message.message && typeof message.message === 'string') {
        if (!currentSessionIdFromRef) {
            logClient('ElevenLabs SDK: onMessage - sessionId (from ref) is not set yet. Transcript for message NOT SAVED.', message.message);
            return;
        }
        const role = message.source === 'ai' ? 'interviewer' : 'candidate';
        logClient(`ElevenLabs SDK: onMessage - Saving transcript for role: ${role}`);
        saveTranscript(role, message.message);
        setTranscripts(prev => [...prev, {role, content: message.message}]);
      } else {
        logClient('ElevenLabs SDK: onMessage - Received message without standard content or unknown type.', message);
      }
    },
    onError: (error: any) => {
      logClient('ElevenLabs SDK: onError - An error occurred.', error);
      setIsTimerRunning(false);
      alert(`An SDK error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsScoring(false);
    },
  });

  const getSignedUrl = async (): Promise<string> => {
    try {
      const response = await fetch("/api/get-signed-url");
      if (!response.ok) {
        throw new Error(`Failed to get signed url: ${response.statusText}`);
      }
      const { signedUrl } = await response.json();
      return signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      throw error;
    }
  };

  const startConversation = useCallback(async () => {
    logClient('startConversation: Initiated.');
    if (isRubricLoading || !defaultRubricId.current || !defaultRubricName.current) {
      alert("Rubric information is still loading or failed to load. Please wait a moment and try again, or refresh the page.");
      return;
    }
    try {
      setIsLoading(true);
      setElapsedTime(0);
      setTranscripts([]);
      setSessionId('');
      sessionIdRef.current = '';

      await navigator.mediaDevices.getUserMedia({ audio: true });
      const signedUrl = await getSignedUrl();
      console.log('Attempting to start ElevenLabs session...');
      
      const eliSessionData: any = await conversation.startSession({
        signedUrl,
      });
      console.log('Raw result from conversation.startSession():', eliSessionData);

      let extractedEliConversationId: string | undefined;
      if (typeof eliSessionData === 'string') {
        extractedEliConversationId = eliSessionData;
      } else if (eliSessionData && typeof eliSessionData.conversationId === 'string') {
        extractedEliConversationId = eliSessionData.conversationId;
      } else if (eliSessionData && typeof eliSessionData.id === 'string') {
        extractedEliConversationId = eliSessionData.id;
      }

      if (!extractedEliConversationId) {
        console.error('Failed to get a valid conversation_id string from ElevenLabs startSession.', "Raw data:", eliSessionData);
        alert('Error starting session: Could not obtain a valid ElevenLabs conversation ID.');
        setIsLoading(false);
        return;
      }
      
      console.log('ElevenLabs session successfully started. ELI Conversation ID:', extractedEliConversationId);
      setSessionId(extractedEliConversationId);

      // Record session metadata in our DB using the ELI conversation_id
      try {
        const metaResponse = await fetch('/api/sessions/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: extractedEliConversationId, 
            rubricId: defaultRubricId.current,
            rubricName: defaultRubricName.current,
            interviewType: defaultRubricName.current 
          }),
        });
        if (metaResponse.ok) {
          console.log('Session metadata saved using ELI ID:', await metaResponse.json());
        } else {
          console.error('Failed to save session metadata:', await metaResponse.text());
        }
      } catch (err) {
        console.error('Error saving session metadata:', err);
      }

    } catch (error) {
      console.error('Failed to start conversation:', error);
      alert('Failed to start interview. Check permissions and console.');
    } finally {
      setIsLoading(false);
    }
  }, [conversation, defaultRubricId, defaultRubricName, isRubricLoading]);

  const stopConversation = useCallback(async () => {
    logClient('stopConversation: Initiated.');
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) {
        console.warn("Attempted to stop conversation but no active session ID (from ref).");
        return;
    }
    console.log('User ending conversation session:', currentSessionId);
    setIsScoring(true); 
    await conversation.endSession();
    console.log('ElevenLabs Conversation session ended by user.');
    setIsTimerRunning(false);
    setTimeout(() => {
        scoreCurrentSession(); 
    }, 3000); 
  }, [conversation, scoreCurrentSession]);

  return (
    <div className="flex flex-col items-center gap-4 w-full conversation-container pt-2 pb-6 px-6">
      {/* Buttons - Conditional Rendering */}
      <div className="flex gap-2 justify-center h-12"> {/* Added fixed height to prevent layout shift */}
        {conversation.status !== 'connected' && !isLoading && !isScoring && (
          <button
            onClick={startConversation}
            disabled={isRubricLoading}
            className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 transition-colors text-base font-medium"
          >
            {isRubricLoading ? 'Loading Setup...' : 'Start Interview'}
          </button>
        )}
        {isLoading && (
          <button
            disabled
            className="px-6 py-3 bg-gray-300 text-white rounded-md text-base font-medium"
          >
            Connecting...
          </button>
        )}
        {conversation.status === 'connected' && !isScoring && (
          <button
            onClick={stopConversation}
            // disabled={conversation.status !== 'connected' || isScoring}
            className="px-6 py-3 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-base font-medium"
          >
            End Interview
          </button>
        )}
        {isScoring && (
          <button
            disabled
            className="px-6 py-3 bg-gray-300 text-white rounded-md text-base font-medium"
          >
            Scoring...
          </button>
        )}
      </div>

      <div className="flex flex-col items-center my-4">
        <div className="flex items-center gap-4 justify-center">
          {/* <p className="text-gray-700">Status: <span className="font-medium">{conversation.status}</span></p> -- Removed */}
          
          {isTimerRunning && (
            <div className={`px-3 py-1 bg-gray-100 rounded-full font-medium flex items-center gap-1 ${isTimerRunning ? 'timer-active-glow' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formatTime(elapsedTime)}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-2 justify-center">
          {conversation.isSpeaking && !isScoring && (
            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Speaking
            </div>
          )}
          {!conversation.isSpeaking && conversation.status === 'connected' && !isScoring && (
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center gap-1">
              <span className="flex h-2 w-2 relative">
                <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Listening
            </div>
          )}
        </div>
      </div>

      {/* Transcript Display - Commented Out */}
      {/* 
      {transcripts.length > 0 && (
        <div className="w-full mt-2 border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h3 className="font-medium">Transcript</h3>
          </div>
          <div className="p-4 max-h-80 overflow-y-auto">
            {transcripts.map((item, index) => (
              <div key={index} className={`mb-3 p-2 rounded ${
                item.role === 'interviewer' 
                ? 'bg-blue-50 border-l-4 border-blue-300' 
                : 'bg-gray-50 border-l-4 border-gray-300'
              }`}>
                <p className="font-semibold mb-1">{item.role === 'interviewer' ? 'Interviewer' : 'You'}</p>
                <p>{item.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      */}

      {/* Score Results Display is REMOVED from here - will be on its own page */}
      {isScoring && !scoreResult && (
        <div className="w-full mt-4 p-4 text-center text-gray-600">
          Scoring interview, please wait...
        </div>
      )}
      {/* The actual score result display is removed as we will navigate away */}

    </div>
  );
} 