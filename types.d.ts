import 'react';

declare module '@11labs/react' {
  interface ConversationState {
    status: 'idle' | 'connecting' | 'connected' | 'disconnected';
    isSpeaking: boolean;
    isRecording?: boolean;
    messages?: Array<{ role: string; content: string }>;
    startSession: (options: { agentId?: string; signedUrl?: string }) => Promise<void>;
    endSession: () => Promise<void>;
    startRecording?: () => void;
    stopRecording?: () => void;
  }

  export function useConversation(options: {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onMessage?: (message: any) => void;
    onError?: (error: any) => void;
  }): ConversationState;
} 