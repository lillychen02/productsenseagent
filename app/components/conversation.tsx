'use client';

import { useConversation } from '@11labs/react';
import { useCallback, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '../../lib/logger'; // Corrected import path

// Helper for timestamped logs
const logClient = (message: string, ...args: any[]) => {
  console.log(`[${new Date().toISOString()}] [CLIENT] ${message}`, ...args);
};

// Sound Wave Icon SVG component (from user, simplified for Tailwind styling)
const SoundWaveIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" className={className} aria-hidden="true">
    {/* Path will inherit fill from parent svg's className */}
    <path d="M280-240v-480h80v480h-80ZM440-80v-800h80v800h-80ZM120-400v-160h80v160h-80Zm480 160v-480h80v480h-80Zm160-160v-160h80v160h-80Z"/>
  </svg>
);

// Phone Disabled Icon SVG component (from user)
const PhoneDisabledIcon = ({ className = "w-6 h-6", fill = "currentColor" }: { className?: string, fill?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" className={className} fill={fill} aria-hidden="true">
    <path d="M792-52 570-274q-89 72-193.5 113T162-120q-24 0-33-12t-9-30v-162q0-14 9-24.5t23-13.5l138-28q11-2 27.5 3t24.5 13l94 94q18-11 39-25t37-27L56-788l56-56 736 736-56 56ZM360-244l-66-66-94 20v88q41-3 81-14t79-28Zm322-144-56-56q15-17 30.5-39t24.5-41l-97-98q-8-8-11-22.5t-1-23.5l26-140q3-14 13.5-23t24.5-9h162q18 0 30 12t12 30q0 110-42 214.5T682-388Zm36-212q17-39 26-79t14-81h-88l-18 94 66 66Zm0 0ZM360-244Z"/>
  </svg>
);

export interface ConversationProps {
  onInterviewActiveChange?: (isActive: boolean) => void;
  sessionId?: string; // For deferred start with pre-generated sessionId
  onElevenLabsIdReceived?: (elevenlabsConversationId: string) => Promise<void>; // Callback for ID mapping
}

export function Conversation({ onInterviewActiveChange, sessionId: providedSessionId, onElevenLabsIdReceived }: ConversationProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEndingSession, setIsEndingSession] = useState<boolean>(false);
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
      console.warn('No sessionId (from ref) available for saving transcript.');
      return;
    }
    
    // ENHANCED LOGGING: Show exactly what ID we're using
    console.log('🔍 TRANSCRIPT SAVE DEBUG:', {
      currentSessionId: currentSessionId,
      isProvidedSessionId: !!providedSessionId,
      providedSessionId: providedSessionId,
      role: role,
      contentPreview: content.substring(0, 50) + '...'
    });
    
    try {
      const response = await fetch('/api/transcripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId, role, content }),
      });
      
      if (!response.ok) {
        console.error('❌ Failed to save transcript. Status:', response.status, await response.json().catch(()=>({})));
      } else {
        const result = await response.json();
        console.log('✅ Transcript saved successfully with sessionId:', currentSessionId, result);
      }
    } catch (error) {
      console.error('❌ Failed to save transcript:', error);
    }
  }, [providedSessionId]); // Add providedSessionId as dependency for logging

  const onConnect = useCallback(() => {
    logClient('ElevenLabs SDK: onConnect - Voice agent connected.');
    setIsTimerRunning(true);
    if (onInterviewActiveChange) onInterviewActiveChange(true);
  }, [onInterviewActiveChange]);

  const onDisconnect = useCallback((reason: any) => {
    logClient('ElevenLabs SDK: onDisconnect - Voice agent disconnected.', reason || 'No specific reason provided by SDK.');
    setIsTimerRunning(false);
    if (onInterviewActiveChange) onInterviewActiveChange(false);
  }, [onInterviewActiveChange]);

  const onMessage = useCallback((message: any) => {
    logClient('ElevenLabs SDK: onMessage - Received message.', message);
    const currentSessionIdFromRef = sessionIdRef.current;
    if ((message as any).type === "interruption") {
      const interruptionEvent = message as any;
      const reason = interruptionEvent.interruption_event?.reason || "Unknown interruption";
      logClient(`ElevenLabs SDK: Interruption occurred - Reason: ${reason}, SessionId: ${currentSessionIdFromRef}`);
      setIsTimerRunning(false);
      alert(`Session interrupted: ${reason}`);
      if (onInterviewActiveChange) onInterviewActiveChange(false);
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
  }, [saveTranscript, onInterviewActiveChange]);

  const onError = useCallback((error: any) => {
    logClient('ElevenLabs SDK: onError - An error occurred.', error);
    setIsTimerRunning(false);
    if (onInterviewActiveChange) onInterviewActiveChange(false);
    alert(`An SDK error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }, [onInterviewActiveChange]);

  const conversation = useConversation({
    onConnect,
    onDisconnect,
    onMessage,
    onError,
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
    
    // If using deferred start (sessionId provided), skip rubric loading
    if (!providedSessionId && (isRubricLoading || !defaultRubricId.current || !defaultRubricName.current)) {
      alert("Rubric information is still loading or failed to load. Please wait a moment and try again, or refresh the page.");
      return;
    }
    
    try {
      setIsLoading(true);
      setIsEndingSession(false);
      setElapsedTime(0);
      setTranscripts([]);
      setSessionId('');
      
      // IMPORTANT: Set sessionIdRef BEFORE starting ElevenLabs session
      // so transcripts can be saved immediately when messages start coming
      if (providedSessionId) {
        sessionIdRef.current = providedSessionId; // Set this early for transcript saving
        console.log('Set sessionId for transcript tracking BEFORE ElevenLabs start:', providedSessionId);
      } else {
        sessionIdRef.current = ''; // Will be set to ElevenLabs ID in legacy mode
      }

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
      
      // Handle different session modes
      if (providedSessionId) {
        // Deferred start mode: sessionIdRef already set above, DON'T update sessionId state
        // to avoid the useEffect overwriting sessionIdRef.current
        console.log('Deferred mode: Keeping sessionIdRef set to internal UUID:', sessionIdRef.current);
        
        // Call the mapping callback if provided
        if (onElevenLabsIdReceived) {
          await onElevenLabsIdReceived(extractedEliConversationId);
        }
      } else {
        // Legacy mode: Set sessionId state AND sessionIdRef to ElevenLabs ID
        setSessionId(extractedEliConversationId);
        sessionIdRef.current = extractedEliConversationId; // Set for transcript saving in legacy mode
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
      }

    } catch (error) {
      console.error('Failed to start conversation:', error);
      alert('Failed to start interview. Check permissions and console.');
    } finally {
      setIsLoading(false);
    }
  }, [conversation, defaultRubricId, defaultRubricName, isRubricLoading, providedSessionId, onElevenLabsIdReceived]);

  const stopConversation = useCallback(async () => {
    logClient('stopConversation: Initiated.');
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) {
        logger.warn({ 
            event: 'StopConversationNoSessionId', 
            message: "Attempted to stop conversation but no active session ID (from ref)." 
        });
        return;
    }
    logger.info({ event: 'UserEndingConversation', details: { sessionId: currentSessionId } });
    setIsEndingSession(true);
    if (onInterviewActiveChange) onInterviewActiveChange(false);
    setIsTimerRunning(false);
    
    try {
      await conversation.endSession(); 
      logClient('ElevenLabs Conversation session ended by user.');
    } catch (error: any) {
      logger.error({ event: 'ElevenLabsEndSessionError', details: { sessionId: currentSessionId }, error: error });
    } finally {
      // Use provided sessionId if available, otherwise use the current sessionId
      const sessionIdForRouting = providedSessionId || currentSessionId;
      router.push(`/processing/${sessionIdForRouting}`);
    }
  }, [conversation, router, onInterviewActiveChange, providedSessionId]);

  // Initial state check - if conversation status is not connected, it's not active.
  useEffect(() => {
    if (conversation.status !== 'connected') {
      if (onInterviewActiveChange) onInterviewActiveChange(false);
    }
  }, [conversation.status, onInterviewActiveChange]);

  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full conversation-container pt-2 pb-6 px-6">
      <div className="flex flex-col items-center justify-center h-auto relative">
        <AnimatePresence mode='wait' initial={false}>
          {conversation.status !== 'connected' && !isLoading && !isEndingSession && (
            <div className="flex flex-col items-center">
              <motion.button
                key="start-interview"
                variants={buttonVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={startConversation}
                disabled={isRubricLoading}
                className="p-5 bg-gray-100 rounded-full hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                aria-label="Start your interview (voice only)"
                title="Start your interview (voice only)"
              >
                {isRubricLoading ? (
                  <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <SoundWaveIcon className="w-20 h-12 fill-indigo-600 hover:fill-indigo-700" />
                )}
              </motion.button>
            </div>
          )}

          {isLoading && (
            <motion.button
              key="connecting"
              variants={buttonVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              disabled
              className="p-5 rounded-full flex items-center justify-center bg-gray-100 focus:outline-none"
              aria-label="Connecting"
              title="Connecting..."
            >
              <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </motion.button>
          )}

          {conversation.status === 'connected' && !isLoading && !isEndingSession && (
            <div className="flex flex-col items-center my-4 gap-y-3">
              {/* AI Interviewer Indicator */}
              <div className="relative flex items-center justify-center mb-2">
                <div className="w-32 h-32 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center relative">
                  {/* Pulsing rings - only show when speaking */}
                  {conversation.isSpeaking && (
                    <>
                      <div className="absolute w-full h-full rounded-full border-2 border-purple-400/40 animate-ping"></div>
                      <div className="absolute w-40 h-40 rounded-full border-2 border-purple-400/20 animate-ping" style={{ animationDelay: '0.5s' }}></div>
                      <div className="absolute w-48 h-48 rounded-full border border-purple-400/10 animate-ping" style={{ animationDelay: '1s' }}></div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 justify-center h-6">
                {conversation.isSpeaking && (
                  <div className="text-green-800 text-sm font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Speaking
                  </div>
                )}
                {!conversation.isSpeaking && (
                  <div className="text-blue-800 text-sm font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Listening
                  </div>
                )}
              </div>

              {isTimerRunning && (
                <div className={`font-medium flex items-center justify-center h-8 text-gray-700`}>
                  <span>{formatTime(elapsedTime)}</span>
                </div>
              )}

              <motion.button
                key="end-interview"
                variants={buttonVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={stopConversation}
                className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="End Interview"
                title="End Interview"
              >
                <PhoneDisabledIcon className="w-5 h-5" />
              </motion.button>
            </div>
          )}

          {isEndingSession && (
            <motion.button
              key="ending-session"
              variants={buttonVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              disabled
              className="p-5 bg-gray-100 rounded-full flex items-center justify-center focus:outline-none"
              aria-label="Ending Interview"
              title="Ending Interview..."
            >
              <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 