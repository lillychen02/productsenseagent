'use client';

import { useConversation } from '@11labs/react';
import { useCallback, useState, useEffect } from 'react';

interface Message {
  role: 'interviewer' | 'candidate';
  content: string;
  timestamp?: Date;
}

interface ConversationState {
  status: 'idle' | 'connecting' | 'connected' | 'disconnected';
  isSpeaking: boolean;
  isRecording: boolean;
  messages: Message[];
  startSession: (options: { agentId: string }) => Promise<void>;
  endSession: () => Promise<void>;
  startRecording: () => void;
  stopRecording: () => void;
  sendMessage: (message: string) => void;
}

export function Conversation() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [interviewState, setInterviewState] = useState<'preparing' | 'active' | 'completed'>('preparing');
  const [metrics, setMetrics] = useState({
    startTime: null as Date | null,
    questionCount: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [animationFrames, setAnimationFrames] = useState(0);

  const conversation = useConversation({
    onConnect: () => console.log('Connected'),
    onDisconnect: () => console.log('Disconnected'),
    onMessage: (message) => console.log('Message:', message),
    onError: (error) => console.error('Error:', error),
  }) as unknown as ConversationState;

  // Animation effect for recording indicator
  useEffect(() => {
    let frameId: number;
    if (conversation?.isRecording) {
      const animate = () => {
        setAnimationFrames(prev => (prev + 1) % 30);
        frameId = requestAnimationFrame(animate);
      };
      frameId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frameId);
    }
  }, [conversation?.isRecording]);

  const startConversation = useCallback(async () => {
    try {
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices) {
        console.error("Media devices API not available in this browser");
        setError("Your browser doesn't support microphone access. Try Chrome, Firefox, or Edge.");
        return;
      }
      
      // Request microphone permission with error handling
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micError) {
        console.error("Microphone permission denied:", micError);
        setError("Microphone access was denied. Please allow microphone access to use the interviewer.");
        return;
      }
      
      // Start interview session
      const response = await fetch('/api/interviews/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user', // TODO: Replace with actual user ID
          interviewType: 'product',
          difficulty: 'mid'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start session');
      }

      const { sessionId: newSessionId } = await response.json();
      setSessionId(newSessionId);

      // Start the conversation with your agent
      await conversation.startSession({
        agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
      });

      setInterviewState('active');
      setMetrics(prev => ({ ...prev, startTime: new Date() }));
    } catch (error) {
      console.error("Failed to start conversation:", error);
      setError("Something went wrong starting the interview. Please try again.");
      setInterviewState('completed');
    }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    setInterviewState('completed');
    
    // Track session completion
    if (sessionId) {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          event: 'SESSION_COMPLETED',
          properties: {},
          timestamp: new Date()
        })
      });
    }
  }, [conversation, sessionId]);
  
  // Track analytics events
  const trackEvent = async (eventName: string, properties: Record<string, any>) => {
    if (!sessionId) return;
    
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        event: eventName,
        properties,
        timestamp: new Date()
      })
    });
  };

  // Generate animation styles based on conversation state
  const getRecordingPulseStyle = () => {
    if (!conversation.isRecording) return {};
    
    const scale = 1 + (animationFrames / 60);
    return {
      transform: `scale(${scale})`,
      opacity: 1 - (animationFrames / 60)
    };
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">AI Mock Interview</h1>
        
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            <p>{error}</p>
          </div>
        )}
        
        {interviewState === 'preparing' ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold mb-2">Ready to start your interview?</h2>
              <p className="text-gray-600">Click the button below to begin your practice session</p>
            </div>
            <button
              onClick={startConversation}
              className="px-6 py-3 rounded-full font-medium bg-blue-500 hover:bg-blue-600 text-white text-lg shadow-lg hover:shadow-xl transition-all"
            >
              Start Interview
            </button>
          </div>
        ) : (
          <>
            {/* Interview Status */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {interviewState.charAt(0).toUpperCase() + interviewState.slice(1)}
                </span>
                
                {/* Speaking indicator */}
                {conversation.isSpeaking && (
                  <span className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                    Interviewer Speaking
                  </span>
                )}
                
                {/* Recording indicator */}
                {conversation.isRecording && (
                  <span className="relative flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    Recording
                  </span>
                )}
              </div>
              
              <span className="text-sm text-gray-500">
                Status: {conversation.status}
              </span>
            </div>

            {/* Interactive area with microphone */}
            <div className="relative mb-6 flex flex-col items-center justify-center rounded-xl bg-gradient-to-r from-blue-50 to-teal-50 p-8">
              {/* Main microphone button */}
              <button
                onClick={() => conversation.isRecording ? conversation.stopRecording() : conversation.startRecording()}
                className={`relative z-10 flex items-center justify-center w-20 h-20 rounded-full shadow-lg transition-all ${
                  conversation.isRecording 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {/* Pulsing effect when recording */}
                {conversation.isRecording && (
                  <div 
                    className="absolute -inset-3 rounded-full bg-red-400 animate-ping opacity-25"
                  ></div>
                )}
                
                <svg className="w-8 h-8 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                  {conversation.isRecording ? (
                    <path d="M6 6h12v12H6z"/> // Stop icon
                  ) : (
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/> // Mic icon
                  )}
                </svg>
              </button>
            </div>

            {/* Messages Display */}
            <div className="mb-6 h-96 overflow-y-auto border rounded-lg p-4">
              {(conversation.messages || []).map((message: Message, index: number) => (
                <div 
                  key={index} 
                  className={`mb-4 p-3 rounded-lg ${
                    message.role === 'interviewer' 
                      ? 'bg-blue-50 text-blue-800' 
                      : 'bg-gray-50 text-gray-800'
                  }`}
                >
                  <div className="font-medium mb-1">
                    {message.role === 'interviewer' ? 'Interviewer' : 'You'}
                  </div>
                  <p>{message.content}</p>
                </div>
              ))}
            </div>

            {/* End Interview Button */}
            <div className="flex justify-center">
              <button
                onClick={stopConversation}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium bg-red-500 hover:bg-red-600 text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                End Interview
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 