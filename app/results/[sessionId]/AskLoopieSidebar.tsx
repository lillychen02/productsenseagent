'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage } from '@/types';
import ReactMarkdown from 'react-markdown';

// Simple Loopie Icon (Placeholder - can be kept or removed if no longer used anywhere)
// const LoopieIcon = () => (
//   <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-semibold mr-2 flex-shrink-0">
//     <span>L</span>
//   </div>
// );

// Thinking Indicator Component
const ThinkingIndicator = () => (
  <div className="flex items-center space-x-1 p-2">
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
  </div>
);

interface AskLoopieSidebarProps {
  isOpen: boolean;
  onClose: () => void; // Function to close the sidebar
  sessionId: string; // Pass sessionId for API calls later
}

export const AskLoopieSidebar: React.FC<AskLoopieSidebarProps> = ({ 
  isOpen, 
  onClose,
  sessionId
}) => {
  console.log("AskLoopieSidebar - received sessionId prop:", sessionId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Loading history or sending message
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null); // For auto-scrolling
  const [isThinking, setIsThinking] = useState(false); // New state for thinking indicator

  // Scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch chat history when sidebar opens
  useEffect(() => {
    if (isOpen && sessionId) {
      console.log("AskLoopieSidebar - useEffect (fetchHistory) using sessionId:", sessionId);
      const fetchHistory = async () => {
        console.log(`FETCH_HISTORY for ${sessionId}: Setting isLoading, clearing error, calling setMessages([])`);
        setIsLoading(true);
        setError(null);
        setMessages([]);
        try {
          const response = await fetch(`/api/chat-sessions/${sessionId}`);
          console.log(`FETCH_HISTORY for ${sessionId}: API response status: ${response.status}`);
          const data = await response.json();
          console.log(`FETCH_HISTORY for ${sessionId}: API response data:`, data);
          if (!response.ok) {
            if (response.status === 404 || (response.status === 200 && data.messages && data.messages.length === 0)) { 
                console.log('No existing chat session found or session is empty, starting fresh.');
                setMessages([]); 
            } else {
                 console.error(`FETCH_HISTORY for ${sessionId}: Error - Non-OK response: ${response.statusText}`);
                 throw new Error(`Failed to fetch chat history: ${response.statusText}`);
            }
          } else {
             setMessages(data.messages || []); 
          }
        } catch (err: any) {
          console.error(`FETCH_HISTORY for ${sessionId}: Error caught:`, err);
          setError('Could not load chat history.');
          setMessages([]);
        } finally {
          // Log messages.length AFTER state updates might have settled, though direct log might not show immediate update
          // For more accurate check of state AFTER setMessages, log inside a subsequent useEffect dependent on messages
          console.log(`FETCH_HISTORY for ${sessionId}: Setting isLoading to false.`); 
          setIsLoading(false);
        }
      };
      fetchHistory();
    }
  }, [isOpen, sessionId]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- Send Message Function (To be added next) --- 
  const handleSendMessage = useCallback(async () => {
    console.log("AskLoopieSidebar - handleSendMessage using sessionId:", sessionId);
    const trimmedInput = input.trim();
    if (!trimmedInput || !sessionId) {
      return; // Don't send empty messages
    }

    const newUserMessage: ChatMessage = {
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(), // Use client-side timestamp for optimistic update
    };

    // Optimistic UI update
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setInput('');
    setIsLoading(true);
    setIsThinking(true); // Start thinking indicator
    setError(null);

    try {
      const response = await fetch('/api/ask-loopie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          message: trimmedInput,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
        throw new Error(errorData.error || `API Error: ${response.statusText}`);
      }

      const assistantMessage = await response.json();

      // Replace optimistic user message with actual data if needed, 
      // or just append assistant message
      setMessages(prevMessages => [...prevMessages, assistantMessage]); 
      // Consider updating the timestamp of the user message if needed

    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(`Failed to send message: ${err.message}`);
      // Optional: Remove the optimistic user message on error
      // setMessages(prevMessages => prevMessages.filter(msg => msg !== newUserMessage));
    } finally {
      setIsLoading(false);
      setIsThinking(false); // Stop thinking indicator
      // Ensure scroll happens after state update completes
      setTimeout(scrollToBottom, 0); 
    }
  }, [input, sessionId, messages, setMessages, setInput, setIsLoading, setError, setIsThinking]); // Include all dependencies

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 right-0 h-full w-full max-w-lg bg-gray-100 shadow-xl z-50 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ask-loopie-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-100">
            <h2 id="ask-loopie-title" className="text-lg font-semibold text-indigo-600">Ask Loopie</h2>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
              aria-label="Close chat sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Message List Area */}
          <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-gray-100">
            {isLoading && messages.length === 0 && (
              <p className="text-center text-gray-500">Loading chat history...</p>
            )}
            {!isLoading && messages.length === 0 && (
               <p className="text-center text-gray-400 text-sm">Ask Loopie a question about your interview feedback.</p>
            )}
            {messages.map((msg, index) => (
              <div key={index} className={`flex items-end ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`prose prose-sm px-4 py-2 rounded-lg ${ // Base classes for padding, rounding
                    msg.role === 'user' 
                      ? 'bg-gray-200 text-gray-800 rounded-br-none shadow max-w-[80%]'  // User: specific bg, shadow, and max-width
                      : 'text-gray-800 rounded-bl-none w-full' // Assistant: text color, full width, no explicit bg or shadow
                  }`}
                >
                  <ReactMarkdown
                    components={{
                        // Override default p styling if needed, or allow prose to handle it
                        // p: ({node, ...props}) => <p className="mb-0" {...props} />,
                        // Ensure links open in new tabs if that's desired behavior for Markdown links
                        a: ({node, ...props}) => <a target="_blank" rel="noopener noreferrer" {...props} />
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex items-end justify-start">
                <div className="px-4 py-2 rounded-lg text-gray-800 rounded-bl-none w-full">
                  {/* Thinking indicator also full width */}
                  <ThinkingIndicator />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} /> {/* Element to scroll to */}
          </div>

          {/* Input Bar Area */}
          <div className="p-4 border-t border-gray-200 bg-gray-100">
            <form 
               className="flex items-center gap-2"
               onSubmit={(e) => { 
                  e.preventDefault(); 
                  handleSendMessage(); 
               }}
            >
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your feedback..."
                className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-sm"
                disabled={isLoading} // Disable input while loading/sending
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-1 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                )}
              </button>
            </form>
            {error && (
              <p className="text-red-500 text-xs mt-1.5">{error}</p>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}; 