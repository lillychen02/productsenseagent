'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Mic } from 'lucide-react';
import { ChatBubbleIcon } from './ChatBubbleIcon';
import { AskLoopieSidebar } from './AskLoopieSidebar';
import { motion, AnimatePresence } from 'framer-motion';

// Minimal interfaces for data fetched - align with api/results/[sessionId]/route.ts
interface ScoreItem {
  dimension: string;
  score: number | null;
  feedback: {
    strengths: string[];
    weaknesses: string[];
    exemplar_response_suggestion?: string;
  };
}
interface LLMScoreResponse {
  scores: ScoreItem[];
  overall_recommendation: string;
  summary_feedback?: string;
}
interface ScoreData {
  _id?: string; // Assuming ObjectId is stringified
  sessionId: string;
  rubricName?: string;
  llmResponse: LLMScoreResponse;
  scoredAt: string; // Assuming Date is stringified
  // Add other StoredScore fields if needed for display
}

interface ResultData {
  scoreData: ScoreData;
  transcriptText: string;
  audioDownloadUrl: string | null;
}

interface SelectionActionState {
  visible: boolean;
  selectedText: string;
  top: number;
  left: number;
  width: number; // To help with centering the button if needed
}

// Document Icon SVG component (Updated with user's new SVG for transcripts)
const DocumentIcon = ({ className = "w-5 h-5", fill = "currentColor" }: { className?: string, fill?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" className={className} fill={fill} aria-hidden="true">
    <path d="M280-280h280v-80H280v80Zm0-160h400v-80H280v80Zm0-160h400v-80H280v80Zm-80 480q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z"/>
  </svg>
);

// Download Icon SVG component
const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

// Retry Icon SVG component (for Start New Interview)
const RetryIcon = ({ className = "w-5 h-5", fill = "currentColor" }: { className?: string, fill?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" className={className} fill={fill} aria-hidden="true">
    <path d="M480-80q-75 0-140.5-28.5t-114-77q-48.5-48.5-77-114T120-440h80q0 117 81.5 198.5T480-160q117 0 198.5-81.5T760-440q0-117-81.5-198.5T480-720h-6l62 62-56 58-160-160 160-160 56 58-62 62h6q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-440q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-80Z"/>
  </svg>
);

// New Mail Icon SVG component for the footer
const FooterMailIcon = ({ className = "w-5 h-5", fill = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill={fill} className={className}>
    <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
    <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
  </svg>
);

// Helper function to get emoji for score
const getScoreEmoji = (score: number | null): string => {
  if (score === 1) return '🔴';
  if (score === 2) return '🟡';
  if (score === 3 || score === 4) return '🟢';
  return '⚪'; // Default for null or other scores
};

// Helper function to generate a URL-friendly ID from a skill dimension
const generateSkillId = (dimension: string): string => {
  return dimension
    .toLowerCase()
    .replace(/\s+/g, '-')       // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, ''); // Remove non-alphanumeric characters except hyphens
};

export default function ResultsPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  console.log("ResultsPage - sessionId from URL params:", sessionId);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [selectionAction, setSelectionAction] = useState<SelectionActionState>({
    visible: false,
    selectedText: '',
    top: 0,
    left: 0,
    width: 0
  });
  const [initialLoopieMessage, setInitialLoopieMessage] = useState<string | undefined>(undefined);
  const feedbackContentRef = useRef<HTMLDivElement>(null);
  const elaborateButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (sessionId) {
      console.log("ResultsPage - useEffect (fetchResults) using sessionId:", sessionId);
      const fetchResults = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/results/${sessionId}`);
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Failed to parse error from results API."}));
            throw new Error(errorData.error || `Failed to fetch results: ${response.statusText}`);
          }
          const data = await response.json();
          setResultData(data);
        } catch (err: any) {
          console.error('Error fetching results:', err);
          setError(err.message || 'An unknown error occurred');
        }
        setIsLoading(false);
      };
      fetchResults();
    }
  }, [sessionId]);

  const handleDownloadTranscript = () => {
    if (resultData?.transcriptText) {
      const blob = new Blob([resultData.transcriptText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcript-${sessionId}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getRecommendationColor = (recommendation: string | undefined) => {
    if (!recommendation) return 'text-gray-700';
    switch (recommendation) {
      case 'Strong Hire': return 'text-green-600';
      case 'Hire': return 'text-green-500';
      case 'Mixed': return 'text-yellow-500';
      case 'No Hire': return 'text-gray-700';
      default: return 'text-gray-700';
    }
  };

  const getMotivationalHeader = (recommendation: string | undefined) => {
    const color = getRecommendationColor(recommendation);
    if (!recommendation) return { emoji: "", text: "Your Interview Feedback", subtextColorClass: color };
    switch (recommendation) {
      case 'No Hire': return { emoji: "🟠", text: "Not Ready Yet — Here's how to level up", subtextColorClass: color };
      case 'Mixed': return { emoji: "🟡", text: "Almost There — Just a Few More Tweaks", subtextColorClass: color };
      case 'Hire': return { emoji: "🟢", text: "Great Job — You Nailed It!", subtextColorClass: color };
      case 'Strong Hire': return { emoji: "🌟", text: "Outstanding — This was a standout performance!", subtextColorClass: color };
      default: return { emoji: "", text: "Your Interview Feedback", subtextColorClass: color };
    }
  };

  const getSkillSummary = (feedback: ScoreItem['feedback']): string => {
    const maxLength = 70;
    let summaryText = "";

    const actualStrengths = feedback.strengths?.filter(
      s => s !== "Not reached."
    );

    if (actualStrengths && actualStrengths.length > 0) {
      summaryText = actualStrengths[0];
    } else {
      const actualWeaknesses = feedback.weaknesses?.filter(
        w => w !== "Not reached."
      );
      if (actualWeaknesses && actualWeaknesses.length > 0) {
        summaryText = actualWeaknesses[0];
      } else {
        // Check if the original arrays primarily indicated "not reached"
        const strengthsIndicatedNotReached = feedback.strengths?.length === 1 && feedback.strengths[0] === "Not reached.";
        const weaknessesIndicatedNotReached = feedback.weaknesses?.length === 1 && feedback.weaknesses[0] === "Not reached.";
        
        // If either array exclusively said "not reached" and the other was empty or also exclusively said "not reached"
        if ( (strengthsIndicatedNotReached && (!feedback.weaknesses || feedback.weaknesses.length === 0 || weaknessesIndicatedNotReached)) || 
             (weaknessesIndicatedNotReached && (!feedback.strengths || feedback.strengths.length === 0 || strengthsIndicatedNotReached)) ) {
          return "Not reached.";
        } else {
          return "No specific summary points provided.";
        }
      }
    }

    if (summaryText.length > maxLength) {
      return summaryText.substring(0, maxLength - 3) + "...";
    }
    return summaryText;
  };

  const handleTextMouseUp = (event: React.MouseEvent<HTMLElement>) => {
    if (event.button !== 0) return;

    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText && selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);

      const rect = range.getBoundingClientRect();
      let newTop = rect.bottom + window.scrollY + 8;
      let newLeft = rect.left + window.scrollX + (rect.width / 2);

      setSelectionAction({
        visible: true,
        selectedText: selectedText,
        top: newTop,
        left: newLeft,
        width: rect.width
      });
    } else {
      // This part handles clicks outside of a selection to hide the button
      // Check if the click target is the elaborate button itself
      if (elaborateButtonRef.current && elaborateButtonRef.current.contains(event.target as Node)) {
        // Click was on the elaborate button, do nothing here, let its onClick handle it
        return;
      }
      // If a selection was previously visible and the click is not on the button, hide it.
      if (selectionAction.visible) {
         setSelectionAction({ visible: false, selectedText: '', top: 0, left: 0, width: 0 });
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectionAction.visible && 
          elaborateButtonRef.current && 
          !elaborateButtonRef.current.contains(event.target as Node)) {
        
        const selection = window.getSelection();
        if (!selection || selection.toString().trim() === '' || selection.isCollapsed) {
           setSelectionAction({ visible: false, selectedText: '', top: 0, left: 0, width: 0 });
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectionAction.visible]);
  
  useEffect(() => {
    if (!isSidebarOpen) setInitialLoopieMessage(undefined);
  }, [isSidebarOpen]);

  const handleElaborateClick = () => {
    if (!selectionAction.selectedText) return;
    const message = `The user is reviewing their interview feedback and wants you to elaborate on this: "${selectionAction.selectedText}"`;
    setInitialLoopieMessage(message);
    setIsSidebarOpen(true);
    setSelectionAction({ visible: false, selectedText: '', top: 0, left: 0, width: 0 });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Loopie AI</span>
            </Link>
          </div>
        </header>
        <div className="flex items-center justify-center min-h-[calc(100vh-73px)]">
          <p className="text-lg text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Loopie AI</span>
            </Link>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] p-4 text-center">
          <p className="text-xl font-semibold text-red-600 mb-2">Error Loading Results</p>
          <p className="text-gray-700 mb-6">{error}</p>
          <Link href="/" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
            Back to Interview Page
          </Link>
        </div>
      </div>
    );
  }

  if (!resultData || !resultData.scoreData) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Loopie AI</span>
            </Link>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] p-4 text-center">
          <p className="text-xl font-semibold text-gray-700 mb-6">No results found for this session.</p>
          <Link href="/" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
            Back to Interview Page
          </Link>
        </div>
      </div>
    );
  }

  const { scoreData, transcriptText, audioDownloadUrl } = resultData;
  const motivationalHeaderDetails = getMotivationalHeader(scoreData.llmResponse?.overall_recommendation);

  // Define sidebar width - Tailwind's max-w-lg is 32rem (512px)
  const SIDEBAR_WIDTH_CLASS = "md:mr-[32rem]"; // Changed from 28rem to 32rem
  // const SIDEBAR_WIDTH_PX = 512; // Approximate pixel value if needed

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Loopie AI</span>
          </Link>
        </div>
      </header>

      <div className={`font-sans transition-all duration-300 ease-in-out ${isSidebarOpen ? SIDEBAR_WIDTH_CLASS : 'mr-0'} pb-24`}>
        <div ref={feedbackContentRef} onMouseUp={handleTextMouseUp} className="w-full px-4 sm:px-6 mx-auto pb-24">
          <main className={`max-w-3xl ${isSidebarOpen ? 'mr-0' : 'mx-auto'} bg-white pt-2 sm:pt-4 pb-8 sm:pb-10`}>
            <header className="mb-4 pb-6 border-b border-gray-200 text-left">
              <h1 className="text-3xl font-bold text-gray-800 mb-3 leading-relaxed">
                {motivationalHeaderDetails.emoji && <span className="mr-2">{motivationalHeaderDetails.emoji}</span>}
                {motivationalHeaderDetails.text}
              </h1>
              <div className="text-sm text-gray-500 space-y-0.5 mt-2 mb-3 leading-relaxed">
                <p>Date: <span className="font-normal text-gray-600">{new Date(scoreData.scoredAt).toLocaleDateString()}</span></p>
              </div>
              {scoreData.llmResponse?.summary_feedback && (
                <p className="text-base text-gray-600 leading-relaxed mt-3">
                  {scoreData.llmResponse.summary_feedback}
                </p>
              )}
            </header>

            {scoreData.llmResponse?.scores && scoreData.llmResponse.scores.length > 0 && (
              <section className="mb-8 text-left">
                <h2 className="text-2xl font-bold text-indigo-600 mb-4 leading-relaxed">Your Skills at a Glance</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-3/5">
                          Skill
                        </th>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                          Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {scoreData.llmResponse.scores.map((item: ScoreItem, index: number) => (
                        <tr key={`snapshot-${index}`} className={'bg-transparent'}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900 w-3/5">
                            <a 
                              href={`#${generateSkillId(item.dimension)}`} 
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {item.dimension}
                            </a>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 w-2/5">
                            <span className="mr-1.5">{getScoreEmoji(item.score)}</span>
                            {item.score !== null ? `${item.score}/4` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <hr className="my-8 border-gray-300"/>

            <section className="mb-10 text-left">
              <h2 className="text-2xl font-bold text-indigo-600 mb-6 leading-relaxed">Deep Dive By Skills</h2>
              <div className="space-y-8">
                {scoreData.llmResponse?.scores?.map((item: ScoreItem, index: number) => (
                  <div key={index} id={generateSkillId(item.dimension)} className="scroll-mt-20">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 leading-relaxed">
                      {item.dimension}
                      <span className="ml-2">
                        {getScoreEmoji(item.score)}
                      </span>
                      <span className="text-base font-normal text-gray-600 ml-1">
                        {item.score !== null ? `${item.score}/4` : 'N/A'}
                      </span>
                    </h3>
                    
                    {item.feedback?.strengths && item.feedback.strengths.length > 0 && item.feedback.strengths[0] !== "Not reached." && (
                      <div className="mt-2 mb-3">
                        <h4 className="text-md font-semibold text-gray-700 mb-1 leading-relaxed"><span className="mr-1.5">✅</span>What You Did Well</h4>
                        <ul className="list-disc list-outside text-gray-600 space-y-1">
                          {item.feedback.strengths.map((strength, sIdx) => (
                            <li key={`s-${index}-${sIdx}`} className="ml-8 text-base leading-relaxed">{strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.feedback?.weaknesses && item.feedback.weaknesses.length > 0 && item.feedback.weaknesses[0] !== "Not reached." && (
                      <div className="mt-2 mb-3">
                        <h4 className="text-md font-semibold text-gray-700 mb-1 leading-relaxed"><span className="mr-1.5">❌</span>What Could Be Stronger</h4>
                        <ul className="list-disc list-outside text-gray-600 space-y-1">
                          {item.feedback.weaknesses.map((weakness, wIdx) => (
                            <li key={`w-${index}-${wIdx}`} className="ml-8 text-base leading-relaxed">{weakness}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.score !== null && item.score < 4 && item.feedback?.exemplar_response_suggestion && (
                      <div className="mt-3 pt-3 border-t border-dashed border-gray-300">
                        <h4 className="text-md font-semibold text-gray-700 mb-1 leading-relaxed"><span className="mr-1.5">💡</span>Try This Next Time</h4>
                        <p className="text-sm text-gray-600 italic ml-7 leading-relaxed">{item.feedback.exemplar_response_suggestion}</p>
                      </div>
                    )}

                    {(item.feedback?.strengths?.[0] === "Not reached." || item.feedback?.weaknesses?.[0] === "Not reached.") && (
                       <p className="text-gray-500 italic mt-2">Not reached.</p>
                    )}
                    {index < (scoreData.llmResponse.scores.length -1) &&  <hr className="mt-4 border-gray-200"/>}
                  </div>
                ))}
                {(!scoreData.llmResponse?.scores || scoreData.llmResponse.scores.length === 0) && (
                  <p className="text-gray-500 italic">No detailed dimension scores available.</p>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {selectionAction.visible && selectionAction.selectedText && (
          <motion.button
            ref={elaborateButtonRef}
            key="elaborate-button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{
              position: 'absolute',
              top: `${selectionAction.top}px`,
              left: `${selectionAction.left}px`,
              transform: 'translateX(-50%)',
            }}
            className="z-[60] p-2 bg-indigo-50 text-indigo-700 rounded-md shadow-lg text-xs flex items-center gap-1 hover:bg-indigo-100 transition-all"
            onClick={handleElaborateClick}
          >
            💬 Ask Loopie to elaborate
          </motion.button>
        )}
      </AnimatePresence>

      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-transparent pb-4 pt-2">
        <div className="flex justify-center">
          <div className="inline-flex items-center justify-center gap-x-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full p-2 shadow-lg">
            <button
              onClick={() => setIsTranscriptModalOpen(true)}
              disabled={!transcriptText}
              title="View Transcript"
              aria-label="View Transcript"
              className="p-2 text-white hover:bg-white/20 rounded-full disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-transparent"
            >
              <DocumentIcon className="w-5 h-5" fill="currentColor" />
            </button>

            <ChatBubbleIcon 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-white hover:bg-white/20 rounded-full disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-transparent flex items-center justify-center"
              title="Ask Loopie"
              ariaLabel="Ask Loopie"
            />

            <Link 
              href="/"
              title="Start New Interview"
              aria-label="Start New Interview"
              className="p-2 text-white hover:bg-white/20 rounded-full disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-transparent flex items-center justify-center"
            >
              <RetryIcon className="w-5 h-5" fill="currentColor" />
            </Link>
          </div>
        </div>
      </footer>

      {isTranscriptModalOpen && resultData?.transcriptText && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Interview Transcript</h3>
              <button 
                onClick={() => setIsTranscriptModalOpen(false)} 
                className="text-gray-500 hover:text-gray-700 text-2xl p-1"
                aria-label="Close transcript modal"
              >
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-grow">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded-md">
                {resultData.transcriptText}
              </pre>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-between items-center">
              <button
                onClick={handleDownloadTranscript}
                disabled={!transcriptText}
                title="Download Transcript"
                className="p-2.5 text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 focus:ring-4 focus:ring-blue-300 disabled:bg-gray-300 disabled:text-gray-400 transition-colors inline-flex items-center"
              >
                <DownloadIcon />
              </button>
              <button 
                onClick={() => setIsTranscriptModalOpen(false)} 
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <AskLoopieSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        sessionId={sessionId} 
        initialMessage={initialLoopieMessage}
      />

    </div>
  );
} 