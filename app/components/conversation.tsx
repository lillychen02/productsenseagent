'use client';

import { useConversation } from '@11labs/react';
import { useCallback, useState } from 'react';

export function Conversation() {
  const [agentId, setAgentId] = useState<string>('');
  const [isConfiguring, setIsConfiguring] = useState<boolean>(true);

  const conversation = useConversation({
    onConnect: () => console.log('Connected'),
    onDisconnect: () => console.log('Disconnected'),
    onMessage: (message) => console.log('Message:', message),
    onError: (error) => console.error('Error:', error),
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
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      if (agentId) {
        // Start the conversation with your agent ID directly
        await conversation.startSession({
          agentId: agentId,
        });
      } else {
        // Or use a signed URL for private agents
        const signedUrl = await getSignedUrl();
        await conversation.startSession({
          signedUrl,
        });
      }

    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  }, [conversation, agentId]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  if (isConfiguring) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold">Configure Your Agent</h2>
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700">
            Agent ID (leave empty to use signed URL)
          </label>
          <input
            type="text"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your ElevenLabs agent ID"
          />
        </div>
        <button
          onClick={() => setIsConfiguring(false)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg shadow-md">
      <div className="flex gap-2">
        <button
          onClick={startConversation}
          disabled={conversation.status === 'connected'}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 hover:bg-blue-600 transition-colors"
        >
          Start Conversation
        </button>
        <button
          onClick={stopConversation}
          disabled={conversation.status !== 'connected'}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300 hover:bg-red-600 transition-colors"
        >
          Stop Conversation
        </button>
      </div>

      <div className="flex flex-col items-center">
        <p className="text-gray-700">Status: <span className="font-medium">{conversation.status}</span></p>
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
    </div>
  );
} 