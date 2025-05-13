import { Conversation } from './components/conversation'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-50 to-white">
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
          Interview: Product Sense
        </h1>
        
        {/* Introductory Text Block - Further reduced bottom margin */}
        <div className="mb-4 p-6 bg-white text-gray-700 text-left w-full">
          <p className="mb-4">
            You&apos;re about to practice a real product sense interview—with an AI that thinks and speaks like a top-tier PM interviewer.
          </p>
          <p className="mb-2 font-semibold">Here&apos;s how it works:</p>
          <ul className="list-disc list-outside pl-5 mb-4 space-y-1">
            <li>You&apos;ll respond out loud, just like in a real interview.</li>
            <li>The AI will help clarify any questions you have.</li>
            <li>After you&apos;re done, you&apos;ll get a full evaluation— with coaching-style feedback tied to what you actually said.</li>
          </ul>
        </div>

        <Conversation />
      </div>
    </main>
  )
} 