'use client';

import { useConversation } from '@11labs/react';
import { useCallback, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function Conversation() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [transcripts, setTranscripts] = useState<Array<{role: string, content: string}>>([]);
  
  // Timer state
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Scoring state
  const defaultRubricId = useRef<string | null>(null);
  const [isScoring, setIsScoring] = useState<boolean>(false);
  const [scoreResult, setScoreResult] = useState<any>(null); // Will be typed more specifically later

  // Generate a session ID and fetch default rubric when the component mounts
  useEffect(() => {
    const newSessionId = `session-${Date.now()}`;
    console.log('Generated session ID:', newSessionId);
    setSessionId(newSessionId);

    const fetchDefaultRubric = async () => {
      try {
        const response = await fetch('/api/rubrics');
        if (response.ok) {
          const data = await response.json();
          if (data.rubrics && data.rubrics.length > 0) {
            // Assuming the first rubric is the one we want for "Product Sense"
            defaultRubricId.current = data.rubrics[0]._id; // Store the ID
            console.log('Default rubric ID set:', defaultRubricId.current);
          } else {
            console.warn('No rubrics found in the database.');
          }
        } else {
          console.error('Failed to fetch rubrics:', await response.text());
        }
      } catch (error) {
        console.error('Error fetching default rubric:', error);
      }
    };

    fetchDefaultRubric();
    
    // Add debug helper to window object
    if (typeof window !== 'undefined') {
      (window as any).debugTranscripts = {
        getTranscripts: () => transcripts,
        testTranscript: async () => {
          console.log('Adding test transcript...');
          
          const mockElevenLabsMessage = {
            source: 'ai',
            message: 'This is a test message from the interviewer.'
          };
          
          const role = mockElevenLabsMessage.source === 'ai' ? 'interviewer' : 'candidate';
          const content = mockElevenLabsMessage.message;
          
          const testData = { role, content };
          setTranscripts(prev => [...prev, testData]);
          await saveTranscript(role, content);
          
          console.log('Test transcript added');
          return 'Test transcript added';
        },
        testUserMessage: async () => {
          console.log('Adding test user message...');
          
          const mockUserMessage = {
            source: 'user',
            message: 'This is a test response from the candidate.'
          };
          
          const role = mockUserMessage.source === 'ai' ? 'interviewer' : 'candidate';
          const content = mockUserMessage.message;
          
          const testData = { role, content };
          setTranscripts(prev => [...prev, testData]);
          await saveTranscript(role, content);
          
          console.log('Test user message added');
          return 'Test user message added';
        },
        checkAPI: async () => {
          try {
            const response = await fetch('/api/transcripts');
            const data = await response.json();
            console.log('API response:', data);
            return data;
          } catch (error) {
            console.error('API check failed:', error);
            return 'API check failed';
          }
        },
        logSessionId: () => {
          console.log('Current session ID:', sessionId);
          return sessionId;
        }
      };
      
      console.log('Debug functions available. Try:');
      console.log('- window.debugTranscripts.testTranscript() - Add AI message');
      console.log('- window.debugTranscripts.testUserMessage() - Add user message');
      console.log('- window.debugTranscripts.checkAPI() - Check saved transcripts');
    }
  }, []); // transcripts and saveTranscript removed from deps if they don't need to re-trigger this effect

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
  const saveTranscript = async (role: string, content: string) => {
    console.log('Saving transcript:', { sessionId, role, content });
    try {
      const response = await fetch('/api/transcripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          role,
          content,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to save transcript. Status:', response.status, errorData);
      } else {
        const data = await response.json();
        console.log('Transcript saved successfully:', data);
      }
    } catch (error) {
      console.error('Failed to save transcript:', error);
    }
  };

  // Function to handle session scoring (will be created next)
  const scoreCurrentSession = async () => {
    if (!sessionId) {
      console.error('No session ID available for scoring.');
      alert('Error: No session ID. Cannot score.');
      setIsScoring(false); // Reset on early exit
      return;
    }
    if (!defaultRubricId.current) {
      console.error('No default rubric ID available for scoring.');
      alert('Error: Rubric not configured. Cannot score.');
      setIsScoring(false); // Reset on early exit
      return;
    }

    console.log(`Attempting to score session ${sessionId} with rubric ${defaultRubricId.current}`);

    try {
      const response = await fetch('/api/score-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          rubricId: defaultRubricId.current,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error response from scoring API." }));
        console.error('Scoring API call failed:', response.status, errorData);
        alert(`Error scoring session: ${errorData.error || response.statusText}`);
        setIsScoring(false); // Reset on API error
        return; // Exit if API call failed
      }

      const result = await response.json();
      console.log('Scoring successful:', result);
      if (result.score) {
        alert('Session scored! Redirecting to results page.');
        router.push(`/results/${sessionId}`);
        // setIsScoring will effectively be false on the new page or if user navigates back
      } else {
        console.error('Scoring response did not contain score data:', result);
        alert('Scoring completed, but no score data was returned. Cannot redirect.');
        setIsScoring(false); // Reset if no score data
      }
    } catch (error) {
      console.error('Error during scoring process:', error);
      alert(`An error occurred while scoring the session: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsScoring(false); // Reset on catch-all error
    } 
  };

  const conversation = useConversation({
    onConnect: () => {
      console.log('ElevenLabs voice agent connected');
      setIsTimerRunning(true);
      setScoreResult(null); // Clear scores on new session
    },
    onDisconnect: () => {
      console.log('ElevenLabs voice agent disconnected');
      setIsTimerRunning(false);
    },
    onMessage: (message) => {
      console.log('Raw message from ElevenLabs:', message);
      if (message && message.message) {
        const role = message.source === 'ai' ? 'interviewer' : 'candidate';
        const content = message.message;
        console.log(`Processing ${role} message:`, content);
        const newTranscript = { role, content };
        setTranscripts(prev => [...prev, newTranscript]);
        saveTranscript(role, content);
      } else {
        console.warn('Received message without proper content:', message);
      }
    },
    onError: (error) => {
      console.error('ElevenLabs error:', error);
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
    try {
      setIsLoading(true);
      setElapsedTime(0);
      setScoreResult(null); // Clear previous scores when starting a new conversation
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const signedUrl = await getSignedUrl();
      console.log('Starting conversation with signedUrl');
      await conversation.startSession({
        signedUrl,
      });
      console.log('Conversation session started successfully');
    } catch (error) {
      console.error('Failed to start conversation:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    console.log('Ending conversation session');
    setIsScoring(true); // Set immediately to prevent UI flicker

    await conversation.endSession();
    console.log('Conversation session ended');
    setIsTimerRunning(false);

    setTimeout(() => {
        scoreCurrentSession();
    }, 3000); 
  }, [conversation, sessionId, router]);

  return (
    <div className="flex flex-col items-center gap-4 w-full conversation-container pt-2 pb-6 px-6">
      {/* Buttons - Conditional Rendering */}
      <div className="flex gap-2 justify-center h-12"> {/* Added fixed height to prevent layout shift */}
        {conversation.status !== 'connected' && !isLoading && !isScoring && (
          <button
            onClick={startConversation}
            // disabled is implicitly handled by conditional rendering, but kept for clarity if needed elsewhere
            // disabled={conversation.status === 'connected' || isLoading || isScoring}
            className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-base font-medium"
          >
            Start Interview
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