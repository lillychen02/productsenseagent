import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StartPage from './page';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('StartPage', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (global.fetch as jest.Mock).mockReset();
  });

  it('renders the start page with all elements', () => {
    render(<StartPage />);
    
    // Check for main heading
    expect(screen.getByText('Product Sense Interview')).toBeInTheDocument();
    
    // Check for microcopy
    expect(screen.getByText(/We'll walk you through a live, voice-based scenario/)).toBeInTheDocument();
    expect(screen.getByText(/You will be given a high-level prompt/)).toBeInTheDocument();
    expect(screen.getByText(/Enter your email below/)).toBeInTheDocument();
    
    // Check for email input
    const emailInput = screen.getByPlaceholderText('Enter your email');
    expect(emailInput).toBeInTheDocument();
    
    // Check for submit button
    const submitButton = screen.getByRole('button', { name: /Next/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('validates email format', async () => {
    render(<StartPage />);
    
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const submitButton = screen.getByRole('button', { name: /Next/i });
    
    // Test invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);
    
    expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
    
    // Test valid email
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
    });
  });

  it('handles successful API response', async () => {
    const mockSessionId = 'test-session-123';
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ sessionId: mockSessionId }),
    });

    render(<StartPage />);
    
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const submitButton = screen.getByRole('button', { name: /Next/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);
    
    // Check loading state
    expect(screen.getByText('Getting Started...')).toBeInTheDocument();
    
    // Wait for navigation
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(`/interview/${mockSessionId}`);
    });
    
    // Verify API call
    expect(global.fetch).toHaveBeenCalledWith('/api/sessions/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'test@example.com' }),
    });
  });

  it('handles API error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    render(<StartPage />);
    
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const submitButton = screen.getByRole('button', { name: /Next/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);
    
    // Check error message
    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
    
    // Verify button returns to normal state
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('handles non-200 API response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    render(<StartPage />);
    
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const submitButton = screen.getByRole('button', { name: /Next/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);
    
    // Check error message
    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });
}); 