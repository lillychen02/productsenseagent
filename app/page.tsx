'use client'; // Make this a Client Component

import { Conversation } from './components/conversation'
import { motion } from 'framer-motion'

export default function Home() {
  const cardAnimation = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

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
              <span>You speak your answers out loud—just like a real interview</span>
            </li>
            <li className="flex items-start">
              <span className="text-indigo-500 mr-3 text-xl">›</span>
              <span>Loopie listens and asks questions if needed.</span>
            </li>
            <li className="flex items-start">
              <span className="text-indigo-500 mr-3 text-xl">›</span>
              <span>After the interview, you get specific, coaching-style feedback tied to what you said, so you can improve.</span>
            </li>
          </ul>
        </div>

        <div id="interview-section" className="w-full">
          <Conversation />
        </div>
      </div>

      {/* Feedback Examples Section */}
      <section className="w-full bg-purple-50 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-4">
            🪄 What <span className="text-indigo-600">Loopie</span> gives you after you interview
          </h2>
          <p className="text-center text-gray-600 mx-auto mb-10 sm:mb-12 text-base sm:text-lg">
            These aren&apos;t generic tips. You&apos;ll get coaching tied to exactly what you said out loud.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card 1: MVP Feedback: Over-Explaining the Why */}
            <motion.div 
              variants={cardAnimation} 
              initial="hidden" 
              whileInView="visible" 
              viewport={{ once: true, amount: 0.3 }}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-2xl hover:scale-[1.02] transform transition-all duration-300 ease-in-out flex flex-col"
            >
              <div className="flex items-center text-xl font-semibold text-gray-800 mb-4">
                <span className="text-2xl mr-3">💡</span> 
                <span>MVP Feedback: Over-Explaining the Why</span>
              </div>
              <div className="space-y-4 text-sm flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">What you said:</h3>
                  <blockquote className="pl-3 py-1 border-l-4 border-gray-300 text-gray-600 italic text-[13px] leading-relaxed">
                    &ldquo;I think the con is that it doesn&apos;t scale too well. But I like that we could get this out there and then see what happens with it and then see how it goes. And we could validate whether this is true or not before we build something more costly.&rdquo;
                  </blockquote>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1 mt-3">Why it felt unclear:</h3>
                  <p className="text-gray-600 text-[13px] leading-relaxed">
                    You make your point (it doesn&apos;t scale, but it&apos;s good for validation) and then restate it in several similar ways.
                  </p>
                </div>
                <div className="mt-3">
                  <h3 className="font-semibold text-gray-700 mb-1">How you could tighten it:</h3>
                  <div className="bg-green-50 p-3 rounded-md border border-green-200">
                    <p className="text-green-800 font-medium text-[13px] leading-relaxed italic">
                      &ldquo;The downside is it doesn&apos;t scale. But it&apos;s perfect for validating demand before we invest in a more complex solution.&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Focused Solutioning */}
            <motion.div 
              variants={cardAnimation} 
              initial="hidden" 
              whileInView="visible" 
              viewport={{ once: true, amount: 0.3 }}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-2xl hover:scale-[1.02] transform transition-all duration-300 ease-in-out flex flex-col"
            >
              <div className="flex items-center text-xl font-semibold text-gray-800 mb-4">
                <span className="text-2xl mr-3">✂️</span>
                <span>Focused Solutioning</span>
              </div>
              <div className="space-y-4 text-sm flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">What you said:</h3>
                  <blockquote className="pl-3 py-1 border-l-4 border-gray-300 text-gray-600 italic text-[13px] leading-relaxed">
                    &ldquo;So I&apos;ll brainstorm a few solutions that can help us solve this pain point of what songs, what are the best songs to sing? And then we can do some research on how to make sure that our artists are trending on social media.&rdquo;
                  </blockquote>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1 mt-3">Why it feels rambling:</h3>
                  <p className="text-gray-600 text-[13px] leading-relaxed">
                    This sentence starts clearly (&ldquo;I&apos;ll brainstorm a few solutions&rdquo;) but then trails into a vague, less focused ending about researching artist trends and songs to sing — which could distract from your next strong point.
                  </p>
                </div>
                <div className="mt-3">
                  <h3 className="font-semibold text-gray-700 mb-1">How you could tighten it:</h3>
                  <div className="bg-green-50 p-3 rounded-md border border-green-200">
                    <p className="text-green-800 font-medium text-[13px] leading-relaxed italic">
                      &ldquo;Let me walk through a few solutions that could help trend-followers discover what&apos;s hot in music right now.&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Add more cards here if needed */}
          </div>
        </div>
      </section>
    </main>
  )
} 