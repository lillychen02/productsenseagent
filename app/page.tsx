'use client'; // Make this a Client Component

import { motion } from 'framer-motion'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from "./components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card"
import { Badge } from "./components/ui/badge"
import { Mic, Users, TrendingUp, CheckCircle, Star, Play, Shield, Zap, Target, ArrowRight, Lightbulb, Scissors } from "lucide-react"

export default function LandingPage() {
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

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Master Your Most
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {" "}
              Critical Moments
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Real-time feedback for your most high-stakes conversations.<br />
            Practice out loud with AI. Get sharper every time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg px-8 py-6"
              style={{ borderRadius: '1rem' }}
              asChild
            >
              <a href="/interview-selection">
                <Play className="w-5 h-5 mr-2" />
                Start Practicing Now
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border border-gray-300 hover:border-gray-400 text-gray-900 bg-white hover:bg-gray-50 text-lg px-8 py-6"
              style={{ borderRadius: '1rem' }}
              asChild
            >
              <a href="#demo">
                Watch Demo
                <ArrowRight className="w-5 h-5 ml-2" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* What Loopie Gives You Section */}
      <section className="pt-8 pb-20 px-4 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center mb-4">
              <span className="text-3xl mr-3">✨</span>
              <h2 className="text-4xl font-bold text-gray-900">
                What <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Loopie</span> gives you after you interview
              </h2>
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              These aren't generic tips. You'll get coaching tied to exactly what you said out loud.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* MVP Feedback Card */}
            <Card className="border-2 border-yellow-200 bg-white shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                    <Lightbulb className="w-5 h-5 text-yellow-600" />
                  </div>
                  <CardTitle className="text-xl text-gray-900">MVP Feedback: Over-Explaining the Why</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">What you said:</h4>
                  <blockquote className="bg-gray-50 border-l-4 border-gray-300 pl-4 py-3 italic text-gray-700">
                    "I think the con is that it doesn't scale too well. But I like that we could get this out there and then see what happens with it and then see how it goes. And we could validate whether this is true or not before we build something more costly."
                  </blockquote>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Why it felt unclear:</h4>
                  <p className="text-gray-700">
                    You make your point (it doesn't scale, but it's good for validation) and then restate it in several similar ways.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">How you could tighten it:</h4>
                  <blockquote className="bg-green-50 border-l-4 border-green-400 pl-4 py-3 italic text-green-800">
                    "The downside is it doesn't scale. But it's perfect for validating demand before we invest in a more complex solution."
                  </blockquote>
                </div>
              </CardContent>
            </Card>

            {/* Focused Solutioning Card */}
            <Card className="border-2 border-orange-200 bg-white shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                    <Scissors className="w-5 h-5 text-orange-600" />
                  </div>
                  <CardTitle className="text-xl text-gray-900">Focused Solutioning</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">What you said:</h4>
                  <blockquote className="bg-gray-50 border-l-4 border-gray-300 pl-4 py-3 italic text-gray-700">
                    "So I'll brainstorm a few solutions that can help us solve this pain point of what songs, what are the best songs to sing? And then we can do some research on how to make sure that our artists are trending on social media."
                  </blockquote>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Why it feels rambling:</h4>
                  <p className="text-gray-700">
                    This sentence starts clearly ("I'll brainstorm a few solutions") but then trails into a vague, less focused ending about researching artist trends and songs to sing — which could distract from your next strong point.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">How you could tighten it:</h4>
                  <blockquote className="bg-blue-50 border-l-4 border-blue-400 pl-4 py-3 italic text-blue-800">
                    "Let me walk through a few solutions that could help trend-followers discover what's hot in music right now."
                  </blockquote>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Three Critical Scenarios, One Powerful Solution</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Whether you&apos;re preparing for your next career move, board presentation, or funding round, we&apos;ve got you
              covered.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-purple-200 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Mock Interviews</CardTitle>
                <CardDescription className="text-base">
                  Practice technical and behavioral interviews with realistic scenarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Industry-specific questions</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Real-time feedback on delivery</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Confidence scoring</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>Follow-up question handling</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-purple-200 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Executive Meetings</CardTitle>
                <CardDescription className="text-base">
                  Prepare for board meetings, stakeholder updates, and leadership presentations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0" />
                    <span>Executive communication style</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0" />
                    <span>Difficult question scenarios</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0" />
                    <span>Data presentation practice</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0" />
                    <span>Crisis communication prep</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-purple-200 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Investor Pitches</CardTitle>
                <CardDescription className="text-base">
                  Perfect your funding presentations and investor Q&A sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-orange-500 mr-3 flex-shrink-0" />
                    <span>Pitch deck storytelling</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-orange-500 mr-3 flex-shrink-0" />
                    <span>Financial metrics discussion</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-orange-500 mr-3 flex-shrink-0" />
                    <span>Objection handling</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-orange-500 mr-3 flex-shrink-0" />
                    <span>Due diligence preparation</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 bg-gradient-to-br from-gray-50 to-slate-100">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How Loopie AI Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our advanced AI analyzes your speech patterns, content, and delivery to provide personalized coaching that
              actually works.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Choose Your Scenario</h3>
              <p className="text-gray-600">
                Select from mock interviews, executive meetings, or investor pitches. Customize the difficulty and
                specific focus areas.
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Practice with AI</h3>
              <p className="text-gray-600">
                Engage in realistic conversations with our AI coach. Experience dynamic questions and challenging
                scenarios.
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Get Instant Feedback</h3>
              <p className="text-gray-600">
                Receive detailed analysis on your performance, including speech patterns, confidence levels, and content
                quality.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Loopie AI</span>
              </div>
              <p className="text-gray-400">
                Empowering Product Managers to excel in their most critical conversations.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Loopie AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
} 