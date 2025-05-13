'use client';

import React from 'react';

interface ChatBubbleIconProps {
  onClick: () => void;
}

// Simple SVG chat icon
const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-3.04 8.25-6.75 8.25a9.753 9.753 0 01-4.756-1.329l-2.968.89V16.818c.331-.054.654-.121.968-.205C6.44 16.182 3 14.252 3 9.75 3 5.444 6.04 1.75 9.75 1.75S16.5 5.444 16.5 9.75c0 .756-.106 1.48-.3 2.163m4.5 0c.375-.623.625-1.3.625-2.013C21 5.444 17.96 1.75 14.25 1.75 12.02 1.75 10.088 2.817 8.81 4.333m6.688 11.039c.234.18.45.368.652.572M10.5 6a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H10.125" />
  </svg>
);

export const ChatBubbleIcon: React.FC<ChatBubbleIconProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      aria-label="Ask Loopie"
      title="Ask Loopie"
    >
      <ChatIcon />
    </button>
  );
}; 