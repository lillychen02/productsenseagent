'use client';

import { useState, useEffect, useRef, forwardRef } from 'react';

interface InlineEmailFormProps {
  onSubmit: (email: string) => Promise<void>;
  sessionId: string; // To make localStorage key unique per session if needed
}

// Removed MailIcon component

const InlineEmailForm = forwardRef<HTMLDivElement, InlineEmailFormProps>(({ onSubmit, sessionId }, ref) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false); // To hide form after successful submission
  const emailInputRef = useRef<HTMLInputElement>(null); // Ref for the email input
  const successMessageTimerRef = useRef<NodeJS.Timeout | null>(null); // Ref for the success message timer

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (successMessageTimerRef.current) {
        clearTimeout(successMessageTimerRef.current);
      }
    };
  }, []);

  // Check if already submitted for this session to prevent re-showing the form on refresh
  useEffect(() => {
    const submittedKey = `inlineEmailSubmitted_${sessionId}`;
    if (localStorage.getItem(submittedKey)) {
      setIsSubmitted(true);
      setSuccessMessage('Emailed results! Check your inbox');
      // Start timer to clear success message
      if (successMessageTimerRef.current) clearTimeout(successMessageTimerRef.current); // Clear existing timer
      successMessageTimerRef.current = setTimeout(() => {
        setSuccessMessage(null);
        // isSubmitted remains true, so the component will render null
      }, 5000); // 5 seconds
    }
  }, [sessionId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    if (successMessageTimerRef.current) clearTimeout(successMessageTimerRef.current); // Clear existing timer before new submission

    if (!email.trim()) {
      setError('Email address is required.');
      emailInputRef.current?.focus(); // Set focus on error
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email.');
      emailInputRef.current?.focus(); // Set focus on error
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(email);
      setSuccessMessage('Emailed results! Check your inbox');
      setIsSubmitted(true);
      const submittedKey = `inlineEmailSubmitted_${sessionId}`;
      localStorage.setItem(submittedKey, 'true'); // Mark as submitted
      setEmail(''); // Clear email field

      // Start timer to clear success message
      if (successMessageTimerRef.current) clearTimeout(successMessageTimerRef.current);
      successMessageTimerRef.current = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000); // 5 seconds

    } catch (apiError: any) {
      setError(apiError.message || 'Failed to subscribe. Please try again.');
      emailInputRef.current?.focus(); // Set focus on API error as well
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted && successMessage) {
    return (
      <div ref={ref} className="mt-6 mb-8 p-4 bg-green-50 border border-green-200 rounded-md text-center">
        <p className="text-green-700 font-medium">{successMessage}</p>
      </div>
    );
  }
  
  if (isSubmitted) return <div ref={ref} style={{ display: 'none' }} />;

  return (
    <div ref={ref} className="mb-4 pt-2 pb-4 rounded-lg">
      <div className="max-w-lg mx-auto">
        <p className="text-gray-700 mb-2 text-sm sm:text-base text-center sm:text-left italic">
          Want to save or share your results? Get a copy via email
        </p>
        <div className="flex items-stretch w-full border border-indigo-500 rounded-lg overflow-hidden">
          <form onSubmit={handleSubmit} className="flex flex-grow items-stretch">
            <div className="flex-grow relative">
              <input
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter your email"
                className={'w-full h-full px-4 py-3 bg-gray-100 text-gray-800 placeholder-gray-500 focus:outline-none'}
                disabled={isSubmitting}
                aria-label="Email address to save results"
              />
            </div>
            <button
              type="submit"
              className="px-3 sm:px-5 py-3 bg-indigo-500 text-white font-semibold hover:bg-indigo-600 focus:outline-none disabled:opacity-70 whitespace-nowrap"
              disabled={isSubmitting}
              aria-label={isSubmitting ? "Sending results" : "Email My Results"}
            >
              {isSubmitting ? 'Sending...' : 'Email My Results'}
            </button>
          </form>
        </div>
        {/* Error message display with Tailwind classes */}
        {error && (
          <div className="w-full mt-1 text-center">
            <p className="text-red-600 text-xs">
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

InlineEmailForm.displayName = 'InlineEmailForm'; // Good practice for HMR and DevTools

export default InlineEmailForm; 