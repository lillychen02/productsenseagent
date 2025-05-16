import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto py-10 sm:py-16 px-4 sm:px-6 lg:px-8 text-gray-700">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4 text-center">
        About <span className="text-indigo-600">Loopie</span>
      </h1>
      <p className="text-lg sm:text-xl text-center text-gray-600 mb-10">
        Your AI coach for voice-based product manager interviews
      </p>

      <div className="prose prose-lg sm:prose-xl max-w-none text-gray-700 space-y-6">
        <p>
          <span className="text-indigo-600 font-bold">Loopie</span> was built by product managers, for product managers — to help you grow through realistic, voice-first interview practice.
        </p>
        <p> 
          We believe the best way to improve is by doing. That's why <span className="text-indigo-600 font-bold">Loopie</span> gives you real-time feedback tied directly to what you say — clear, specific, and coaching-focused. Just like a great mentor would.
        </p>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200">
        <h3 className="text-xl font-semibold text-gray-800 mb-3 text-center">
          Need help or feedback?
        </h3>
        <p className="text-center text-gray-600 mb-2">
          We'd love to hear from you.
        </p>
        <p className="text-center">
          <a href="mailto:lillychen02@gmail.com" className="text-indigo-600 hover:text-indigo-700 hover:underline text-lg">
            <span role="img" aria-label="Email Emoji" className="mr-1.5">📨</span>lillychen02@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
} 