import { Conversation } from './components/conversation'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-6 pt-10 bg-white">
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
          Product Sense Interview
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 mb-10">
          Interview like it&apos;s real. Get coaching that makes you better.
        </p>
        
        <div className="mb-8 p-6 bg-gray-50 rounded-xl shadow-sm text-left w-full max-w-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">How it works:</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="text-indigo-500 mr-3 text-xl">›</span>
              <span>Speak your answers out loud—just like a real interview</span>
            </li>
            <li className="flex items-start">
              <span className="text-indigo-500 mr-3 text-xl">›</span>
              <span>The AI will clarify your questions</span>
            </li>
            <li className="flex items-start">
              <span className="text-indigo-500 mr-3 text-xl">›</span>
              <span>After, get tailored feedback from your coach (Loopie) based on what you said</span>
            </li>
          </ul>
        </div>

        <Conversation />
      </div>
    </main>
  )
} 