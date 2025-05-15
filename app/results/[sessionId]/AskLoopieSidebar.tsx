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
  initialMessage?: string; // Added new optional prop
}

export const AskLoopieSidebar: React.FC<AskLoopieSidebarProps> = ({ 
  isOpen, 
  onClose,
  sessionId,
  initialMessage // Destructure new prop
}) => {
  console.log("AskLoopieSidebar - received sessionId prop:", sessionId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Loading history or sending message
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null); // For auto-scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null); // Ref for the scrollable message container
  const [isThinking, setIsThinking] = useState(false); // New state for thinking indicator
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false); // Track if user has manually scrolled up
  const previousInitialMessageRef = useRef<string | undefined | null>(null); // New ref to track previous initialMessage

  // Scroll to bottom function
  const scrollToBottom = (behavior: ScrollBehavior = "auto") => { // Default to auto for instant scroll after new message
    messagesEndRef.current?.scrollIntoView({ behavior });
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
        setUserHasScrolledUp(false); // Reset scroll state on new session/open
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
          // Scroll to bottom after initial history load if there are messages
          if (messages.length > 0) {
            setTimeout(() => scrollToBottom('auto'), 0); // Auto for initial load
          }
        }
      };
      fetchHistory();
    }
  }, [isOpen, sessionId]);

  // Conditional auto-scroll logic
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];

    // Only scroll to bottom if the last message is from the user (they just sent it)
    if (lastMessage.role === 'user') {
      // setUserHasScrolledUp(false); // This is already handled in handleSendMessage
      scrollToBottom("smooth");
    }
    // No automatic scrolling for assistant messages regardless of userHasScrolledUp state.

  }, [messages]); // Only trigger on new messages

  // Detect manual scroll by user to set userHasScrolledUp
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (scrollContainer) {
          // Check if scrolled up from the bottom by a certain threshold
          const isScrolledToBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 50; // 50px threshold
          if (!isScrolledToBottom) {
            setUserHasScrolledUp(true);
          } else {
            setUserHasScrolledUp(false); // Allow auto-scroll again if user scrolls back to bottom
          }
        }
      }, 150); // Debounce scroll event slightly
    };

    if (isOpen && scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
      clearTimeout(scrollTimeout);
    };
  }, [isOpen]); // Re-attach listener if sidebar re-opens

  // Effect to handle initialMessage for auto-sending
  useEffect(() => {
    if (isOpen && initialMessage && initialMessage !== previousInitialMessageRef.current) {
      console.log("[AskLoopieSidebar] Processing new initialMessage for auto-send:", initialMessage);
      
      const sendMessageInternal = async (messageContent: string) => {
        const newUserMessage: ChatMessage = {
          role: 'user',
          content: messageContent,
          timestamp: new Date(),
        };
        setMessages(prevMessages => [...prevMessages, newUserMessage]);
        setIsThinking(true);
        setError(null);

        try {
          const response = await fetch('/api/ask-loopie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, message: messageContent }),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Failed to parse error" }));
            throw new Error(errorData.error || `API Error: ${response.statusText}`);
          }
          const assistantMessage = await response.json();
          setMessages(prevMessages => [...prevMessages, assistantMessage]);
        } catch (err: any) {
          setError(`Failed to send initial message: ${err.message}`);
          setMessages(prevMessages => prevMessages.filter(msg => msg !== newUserMessage)); 
        } finally {
          setIsThinking(false);
        }
      };

      sendMessageInternal(initialMessage);
      previousInitialMessageRef.current = initialMessage; // Mark this message as processed
      setInput(''); // Ensure input is clear after auto-sending
    }
    
    if (!isOpen) {
      previousInitialMessageRef.current = null; // Reset when sidebar closes
      setInput(''); // Clear input when sidebar closes
    }
  }, [isOpen, initialMessage, sessionId, setMessages, setError, setIsThinking, setInput]); // Dependencies

  // --- Send Message Function (To be added next) --- 
  const handleSendMessage = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || !sessionId || isThinking) return;

    const newUserMessage: ChatMessage = {
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
    };
    
    setUserHasScrolledUp(false); 
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setInput(''); // Clear input after user clicks send
    setIsThinking(true);
    setError(null);

    try {
      const response = await fetch('/api/ask-loopie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: trimmedInput }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
        throw new Error(errorData.error || `API Error: ${response.statusText}`);
      }
      const assistantMessage = await response.json();
      setMessages(prevMessages => [...prevMessages, assistantMessage]);
    } catch (err: any) {
      setError(`Failed to send message: ${err.message}`);
       // setMessages(prevMessages => prevMessages.filter(msg => msg !== newUserMessage)); // Rollback optimistic UI
    } finally {
      setIsThinking(false);
    }
  }, [input, sessionId, isThinking]); // Simplified dependencies for user send

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
          <div 
            ref={scrollContainerRef} 
            className="flex-grow p-4 overflow-y-auto space-y-4 bg-gray-100"
          >
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
                disabled={isLoading || isThinking} // Disable input while loading/sending
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading || isThinking}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-1 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {(isLoading || isThinking) ? (
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