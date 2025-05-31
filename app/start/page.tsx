'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StartPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Prefetch interview route when component mounts
  useEffect(() => {
    router.prefetch('/interview/[sessionId]');
  }, [router]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailFocus = () => {
    // Additional prefetch on email input focus for better performance
    router.prefetch('/interview/[sessionId]');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to start session');
      }

      const data = await response.json();
      router.push(`/interview/${data.sessionId}`);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center px-4 pt-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Product Sense Interview
          </h2>
          <div className="mt-6 space-y-4 text-lg text-gray-600 text-left">
            <p>
              <strong>What to expect:</strong> You will be given a high level prompt and then asked to lead the discussion and craft a solution.
            </p>
            <p>
              <strong>Duration:</strong> 40 mins
            </p>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="relative flex items-center bg-gray-100 rounded-full shadow-lg overflow-hidden border-2 border-transparent focus-within:border-indigo-500 transition-all duration-200">
            <div className="flex-1">
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-6 py-4 bg-transparent border-none text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 text-base"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={handleEmailFocus}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-8 py-4 text-base font-medium rounded-full text-white transition-all duration-200 ${
                isLoading
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
              }`}
            >
              {isLoading ? 'Starting...' : 'Next'}
            </button>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
        </form>
      </div>
    </div>
  );
} 