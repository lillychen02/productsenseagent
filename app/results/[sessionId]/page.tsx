'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChatBubbleIcon } from './ChatBubbleIcon';
import { AskLoopieSidebar } from './AskLoopieSidebar';

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

// Document Icon SVG component
const DocumentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

// Download Icon SVG component
const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-lg text-gray-600">Loading results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 text-center">
        <p className="text-xl font-semibold text-red-600 mb-2">Error Loading Results</p>
        <p className="text-gray-700 mb-6">{error}</p>
        <Link href="/" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
          Back to Interview Page
        </Link>
      </div>
    );
  }

  if (!resultData || !resultData.scoreData) {
    return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 text-center">
        <p className="text-xl font-semibold text-gray-700 mb-6">No results found for this session.</p>
        <Link href="/" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
          Back to Interview Page
        </Link>
      </div>
    );
  }

  const { scoreData, transcriptText, audioDownloadUrl } = resultData;
  const motivationalHeaderDetails = getMotivationalHeader(scoreData.llmResponse?.overall_recommendation);

  // Define sidebar width - Tailwind's max-w-lg is 32rem (512px)
  const SIDEBAR_WIDTH_CLASS = "md:mr-[32rem]"; // Changed from 28rem to 32rem
  // const SIDEBAR_WIDTH_PX = 512; // Approximate pixel value if needed

  return (
    // Removed pt-4 from the outermost container
    <div className={`min-h-screen bg-white font-sans transition-all duration-300 ease-in-out ${isSidebarOpen ? SIDEBAR_WIDTH_CLASS : 'mr-0'} pb-12 px-4 sm:px-6 lg:px-8`}>
      {/* Inner content wrapper: only horizontal padding */}
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Main content block: pt-2 px-8 pb-8 sm:pt-4 sm:px-10 sm:pb-10 */}
        <main className={`max-w-4xl ${isSidebarOpen ? 'mx-0' : 'mx-auto'} bg-white pt-2 px-8 pb-8 sm:pt-4 sm:px-10 sm:pb-10`}>
          <header className="mb-8 pb-6 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-800 mb-3">
              {motivationalHeaderDetails.emoji && <span className="mr-2">{motivationalHeaderDetails.emoji}</span>}
              {motivationalHeaderDetails.text}
            </h1>
            <div className="text-sm text-gray-500 space-y-0.5 mt-2 mb-3">
              <p>
                Recommendation: <span className={`font-semibold ${motivationalHeaderDetails.subtextColorClass}`}>
                  {scoreData.llmResponse?.overall_recommendation || 'N/A'}
                </span>
              </p>
              <p>Date: <span className="font-normal text-gray-600">{new Date(scoreData.scoredAt).toLocaleDateString()}</span></p>
              <p>Interview Type: <span className="font-normal text-gray-600">{scoreData.rubricName || 'N/A'}</span></p>
            </div>
            {scoreData.llmResponse?.summary_feedback && (
              <p className="text-base text-gray-600 leading-relaxed mt-3">
                {scoreData.llmResponse.summary_feedback}
              </p>
            )}
          </header>

          {scoreData.llmResponse?.scores && scoreData.llmResponse.scores.length > 0 && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Skills at a Glance</h2>
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

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Deep Dive By Skills</h2>
            <div className="space-y-8">
              {scoreData.llmResponse?.scores?.map((item: ScoreItem, index: number) => (
                <div key={index} id={generateSkillId(item.dimension)} className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
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
                      <h4 className="text-md font-semibold text-gray-700 mb-1"><span className="mr-1.5">✅</span>What You Did Well</h4>
                      <ul className="list-disc list-outside text-gray-600 space-y-1">
                        {item.feedback.strengths.map((strength, sIdx) => (
                          <li key={`s-${index}-${sIdx}`} className="ml-8">{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {item.feedback?.weaknesses && item.feedback.weaknesses.length > 0 && item.feedback.weaknesses[0] !== "Not reached." && (
                    <div className="mt-2 mb-3">
                      <h4 className="text-md font-semibold text-gray-700 mb-1"><span className="mr-1.5">❌</span>What Could Be Stronger</h4>
                      <ul className="list-disc list-outside text-gray-600 space-y-1">
                        {item.feedback.weaknesses.map((weakness, wIdx) => (
                          <li key={`w-${index}-${wIdx}`} className="ml-8">{weakness}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Display Exemplar Response Suggestion - Relabelled as Try This Next Time */}
                  {item.score !== null && item.score < 4 && item.feedback?.exemplar_response_suggestion && (
                    <div className="mt-3 pt-3 border-t border-dashed border-gray-300">
                      <h4 className="text-md font-semibold text-gray-700 mb-1"><span className="mr-1.5">💡</span>Try This Next Time</h4>
                      <p className="text-sm text-gray-600 italic ml-7">{item.feedback.exemplar_response_suggestion}</p>
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
          
          <section className="py-8">
            <div className="flex justify-center items-center">
              <button
                onClick={() => setIsTranscriptModalOpen(true)}
                disabled={!transcriptText}
                title="View Transcript"
                className="p-3 text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 focus:ring-4 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-400 transition-colors shadow-md"
              >
                <DocumentIcon />
              </button>
            </div>
          </section>

          <footer className="mt-8 pt-8 border-t border-gray-200 text-center">
            <Link href="/" className="text-blue-600 hover:text-blue-800 hover:underline">
              &larr; Start New Interview
            </Link>
          </footer>
        </main>
      </div>

      {/* Transcript Modal */}
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

      {/* Ask Loopie Chat Components - Sidebar itself is position: fixed, so it doesn't affect this layout flow directly */}
      <ChatBubbleIcon onClick={() => setIsSidebarOpen(true)} />
      <AskLoopieSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        sessionId={sessionId} 
      />
    </div>
  );
} 