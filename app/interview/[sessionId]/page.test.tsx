import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InterviewPage from './page';
import { useParams } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

// Mock the Conversation component
jest.mock('../../components/conversation', () => ({
  Conversation: ({ sessionId, onElevenLabsIdReceived, onInterviewActiveChange }: any) => (
    <div data-testid="conversation-component">
      <div data-testid="session-id">{sessionId}</div>
      <button 
        onClick={() => onElevenLabsIdReceived('test-elevenlabs-id')}
        data-testid="trigger-mapping"
      >
        Trigger Mapping
      </button>
      <button 
        onClick={() => onInterviewActiveChange(true)}
        data-testid="trigger-active-change"
      >
        Start Interview
      </button>
    </div>
  ),
}));

// Mock fetch
global.fetch = jest.fn();

describe('InterviewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  it('renders the interview page with session ID', () => {
    (useParams as jest.Mock).mockReturnValue({ sessionId: 'test-session-123' });

    render(<InterviewPage />);

    expect(screen.getByText('Product Sense Interview')).toBeInTheDocument();
    expect(screen.getByText('Ready to begin your interview? Click the microphone to start.')).toBeInTheDocument();
    expect(screen.getByTestId('conversation-component')).toBeInTheDocument();
    expect(screen.getByTestId('session-id')).toHaveTextContent('test-session-123');
  });

  it('shows error when no session ID is provided', () => {
    (useParams as jest.Mock).mockReturnValue({});

    render(<InterviewPage />);

    expect(screen.getByText('Invalid Session')).toBeInTheDocument();
    expect(screen.getByText('No session ID provided.')).toBeInTheDocument();
  });

  it('handles ElevenLabs ID mapping successfully', async () => {
    (useParams as jest.Mock).mockReturnValue({ sessionId: 'test-session-123' });

    render(<InterviewPage />);

    const triggerButton = screen.getByTestId('trigger-mapping');
    triggerButton.click();

    expect(global.fetch).toHaveBeenCalledWith('/api/sessions/map-elevenlabs-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: 'test-session-123',
        elevenlabsConversationId: 'test-elevenlabs-id',
      }),
    });
  });

  it('handles mapping error gracefully', async () => {
    (useParams as jest.Mock).mockReturnValue({ sessionId: 'test-session-123' });
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Mapping failed'));

    render(<InterviewPage />);

    const triggerButton = screen.getByTestId('trigger-mapping');
    triggerButton.click();

    // Wait for error state to update
    await waitFor(() => {
      expect(screen.getByText(/Warning: Failed to map session IDs/)).toBeInTheDocument();
    });
  });
}); 