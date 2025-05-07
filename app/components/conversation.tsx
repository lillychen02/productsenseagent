'use client';

import { useConversation } from '@11labs/react';
import { useCallback, useState, useEffect, useRef } from 'react';

export function Conversation() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [transcripts, setTranscripts] = useState<Array<{role: string, content: string}>>([]);
  
  // Timer state
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate a session ID when the component mounts
  useEffect(() => {
    const newSessionId = `session-${Date.now()}`;
    console.log('Generated session ID:', newSessionId);
    setSessionId(newSessionId);
    
    // Add debug helper to window object
    if (typeof window !== 'undefined') {
      (window as any).debugTranscripts = {
        getTranscripts: () => transcripts,
        testTranscript: async () => {
          console.log('Adding test transcript...');
          
          // Simulate an ElevenLabs message with the correct structure
          const mockElevenLabsMessage = {
            source: 'ai',
            message: 'This is a test message from the interviewer.'
          };
          
          // Process it like a real message
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
          
          // Simulate a user message with the correct structure
          const mockUserMessage = {
            source: 'user',
            message: 'This is a test response from the candidate.'
          };
          
          // Process it like a real message
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

  const conversation = useConversation({
    onConnect: () => {
      console.log('ElevenLabs voice agent connected');
      // Start the timer when connected
      setIsTimerRunning(true);
    },
    onDisconnect: () => {
      console.log('ElevenLabs voice agent disconnected');
      // Stop the timer when disconnected
      setIsTimerRunning(false);
    },
    onMessage: (message) => {
      console.log('Raw message from ElevenLabs:', message);
      
      // Check for message content in the correct property
      if (message && message.message) {
        // Determine if this is from the user or AI
        const role = message.source === 'ai' ? 'interviewer' : 'candidate';
        const content = message.message;
        
        console.log(`Processing ${role} message:`, content);
        
        // Add to local state for display
        const newTranscript = { role, content };
        setTranscripts(prev => [...prev, newTranscript]);
        
        // Send to API
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
      // Reset elapsed time when starting new conversation
      setElapsedTime(0);
      
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start the conversation using the signed URL approach
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
    await conversation.endSession();
    console.log('Conversation session ended');
    // Stop the timer
    setIsTimerRunning(false);
  }, [conversation]);

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg shadow-md w-full max-w-2xl">
      <div className="flex gap-2">
        <button
          onClick={startConversation}
          disabled={conversation.status === 'connected' || isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 hover:bg-blue-600 transition-colors"
        >
          {isLoading ? 'Connecting...' : 'Start Interview'}
        </button>
        <button
          onClick={stopConversation}
          disabled={conversation.status !== 'connected'}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300 hover:bg-red-600 transition-colors"
        >
          End Interview
        </button>
      </div>

      <div className="flex flex-col items-center">
        <div className="flex items-center gap-4">
          <p className="text-gray-700">Status: <span className="font-medium">{conversation.status}</span></p>
          
          {/* Timer display */}
          {isTimerRunning && (
            <div className="px-3 py-1 bg-gray-100 rounded-full font-medium flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formatTime(elapsedTime)}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          {conversation.isSpeaking && (
            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Speaking
            </div>
          )}
          {!conversation.isSpeaking && conversation.status === 'connected' && (
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center gap-1">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Listening
            </div>
          )}
        </div>
      </div>

      {/* Transcript Display */}
      {transcripts.length > 0 && (
        <div className="w-full mt-6 border rounded-lg overflow-hidden">
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
    </div>
  );
} 