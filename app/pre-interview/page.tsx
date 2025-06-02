'use client'

import { useState } from 'react'
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Mic, ArrowLeft, Brain, CheckCircle, Play, Lightbulb, Shield, Loader2, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useRouter } from 'next/navigation'

export default function PreInterviewPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start session')
      }

      const { sessionId } = await response.json()
      
      // Redirect to interview page with sessionId
      router.push(`/interview/${sessionId}`)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Loopie AI</span>
          </div>
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      <div className="container mx-auto px-4 py-3">
        <nav className="text-sm text-gray-600">
          <Link href="/interview-selection" className="text-blue-600 hover:text-blue-800 hover:underline">
            Meetings
          </Link>
          <span className="mx-2">→</span>
          <span className="text-gray-500">Product Sense Interview</span>
        </nav>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Above the Fold - Email Collection */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Product Sense</h1>
          <p className="text-lg text-gray-600 mb-4">
            Enter your email to receive your personalized results and feedback after the interview.
          </p>
        </div>

        {/* Email Collection Form */}
        <div className="mb-12">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-medium">
                  Email address
                </Label>
                {/* Combined Input and Button Container */}
                <div className="flex bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent">
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="you@example.com" 
                    className="flex-1 h-12 text-base border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                    disabled={isLoading}
                  />
                  <Button 
                    type="submit"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 h-12 rounded-l-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        Next
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              <div className="flex items-center space-x-2 text-sm">
                <Shield className="w-4 h-4 text-gray-500" />
                <span className="text-gray-500">Your data is private and never shared.</span>
              </div>
            </form>
          </div>
        </div>

        {/* Section Separator */}
        <div className="border-t border-gray-200 mb-12"></div>

        {/* About This Interview - Below the Fold */}
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Interview</h2>
            <p className="text-gray-600">You will be given an ambiguous prompt and asked to lead the discussion and craft a solution.<br /><br />You will be evaluated on your ability to frame an ambiguous problem, segment users in a market, think clearly about tradeoffs, prioritize effectively and scope an MVP.</p>
          </div>
        </div>
      </div>
    </div>
  )
} 