import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-10">
        About <span className="text-indigo-600">Loopie</span>
      </h1>
      <div className="prose prose-lg sm:prose-xl max-w-none text-gray-700 space-y-6">
        <p>
          <span className="text-indigo-600 font-bold">Loopie</span> was built by product managers, for product managers — to help you grow through real, voice-based interview practice.
        </p>
        <p>
          We believe the best way to improve is by doing. That&apos;s why <span className="text-indigo-600 font-bold">Loopie</span> gives you <strong className="font-semibold">real-time, specific coaching</strong> tied directly to what you say in your mock interviews — <strong className="font-semibold">just like a great mentor would</strong>.
        </p>
        
        <div className="pt-6 text-center sm:text-left">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Have questions about the app?
          </h3>
          <p className="text-gray-600">
            <span role="img" aria-label="Email Emoji" className="mr-1.5">📩</span> 
            Reach out anytime: <a href="mailto:lillychen02@gmail.com" className="text-indigo-600 hover:text-indigo-700 hover:underline">lillychen02@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  );
} 