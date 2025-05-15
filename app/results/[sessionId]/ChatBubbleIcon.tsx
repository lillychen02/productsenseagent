'use client';

import React from 'react';

interface ChatBubbleIconProps {
  onClick: () => void;
  className?: string;
  title?: string;
  ariaLabel?: string;
}

// Updated SVG for the AskLoopie/Chat icon
const ChatIconInternal = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" className="w-6 h-6" fill="currentColor" aria-hidden="true">
    <path d="M331-651 211-771l57-57 120 120-57 57Zm149-95v-170h80v170h-80Zm291 535L651-331l57-57 120 120-57 57Zm-63-440-57-57 120-120 57 57-120 120Zm38 171v-80h170v80H746ZM205-92 92-205q-12-12-12-28t12-28l363-364q35-35 85-35t85 35q35 35 35 85t-35 85L261-92q-12 12-28 12t-28-12Zm279-335-14.5-14-14.5-14-14-14-14-14 28 28 29 28ZM233-176l251-251-57-56-250 250 56 57Z"/>
  </svg>
);

export const ChatBubbleIcon: React.FC<ChatBubbleIconProps> = ({ 
  onClick, 
  className = "p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors flex items-center justify-center",
  title = "Ask Loopie", 
  ariaLabel = "Ask Loopie" 
}) => {
  return (
    <button
      onClick={onClick}
      className={className}
      aria-label={ariaLabel}
      title={title}
    >
      <ChatIconInternal />
    </button>
  );
}; 