'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Conversation } from '../../components/conversation';
import { Mic } from 'lucide-react';
import Link from 'next/link';

export default function InterviewPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [isSessionMapped, setIsSessionMapped] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [isInterviewActive, setIsInterviewActive] = useState(false);

  // Function to handle ElevenLabs ID mapping
  const handleElevenLabsIdMapping = useCallback(async (elevenlabsConversationId: string) => {
    try {
      const response = await fetch('/api/sessions/map-elevenlabs-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          elevenlabsConversationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to map ElevenLabs ID');
      }

      setIsSessionMapped(true);
      console.log('ElevenLabs ID mapped successfully:', elevenlabsConversationId);
    } catch (error) {
      console.error('Error mapping ElevenLabs ID:', error);
      setMappingError(error instanceof Error ? error.message : 'Unknown error');
      // Don't fail the interview, just log the error
    }
  }, [sessionId]);

  const handleInterviewActiveChange = useCallback((isActive: boolean) => {
    setIsInterviewActive(isActive);
    console.log('Interview active state changed:', isActive);
  }, []);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Loopie AI</span>
            </div>
          </div>
        </header>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Session</h1>
            <p className="text-gray-600">No session ID provided.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Loopie AI</span>
          </div>
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      <div className="container mx-auto px-4 py-20 max-w-2xl">
        <nav className="text-sm text-gray-600">
          <Link href="/interview-selection" className="text-blue-600 hover:text-blue-800 hover:underline">
            Meetings
          </Link>
          <span className="mx-2">→</span>
          <Link href="/pre-interview" className="text-blue-600 hover:text-blue-800 hover:underline">
            Product Sense Interview
          </Link>
          <span className="mx-2">→</span>
          <span className="text-gray-500">Interview in Progress</span>
        </nav>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <p className="text-xl text-gray-800 font-medium mb-3">
            {isInterviewActive ? 'Interview In Progress' : 'Click to Start Interview'}
          </p>
        </div>

        <div className="flex justify-center">
          <Conversation 
            sessionId={sessionId}
            onElevenLabsIdReceived={handleElevenLabsIdMapping}
            onInterviewActiveChange={handleInterviewActiveChange}
          />
        </div>

        {mappingError && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800 text-sm">
              Warning: Failed to map session IDs. The interview can continue, but there may be issues with result tracking.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 