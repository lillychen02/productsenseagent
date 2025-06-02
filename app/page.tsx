'use client'; // Make this a Client Component

import { motion } from 'framer-motion'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from "./components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card"
import { Badge } from "./components/ui/badge"
import { Mic, Users, TrendingUp, CheckCircle, Star, Play, Shield, Zap, Target, ArrowRight } from "lucide-react"

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

          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-bold mb-4">Real-time AI Analysis</h3>
                <p className="text-gray-600 mb-6">
                  Our AI provides instant feedback on your tone, pace, clarity, and content structure. Track your
                  improvement over time with detailed analytics.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Target className="w-5 h-5 text-purple-600 mr-3" />
                    <span>Speech pattern analysis</span>
                  </div>
                  <div className="flex items-center">
                    <Target className="w-5 h-5 text-purple-600 mr-3" />
                    <span>Confidence scoring</span>
                  </div>
                  <div className="flex items-center">
                    <Target className="w-5 h-5 text-purple-600 mr-3" />
                    <span>Content structure feedback</span>
                  </div>
                  <div className="flex items-center">
                    <Target className="w-5 h-5 text-purple-600 mr-3" />
                    <span>Progress tracking</span>
                  </div>
                </div>
              </div>
              <div>
                <img
                  src="/placeholder.svg?height=300&width=400"
                  alt="AI Analysis Dashboard"
                  className="rounded-lg shadow-md"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Trusted by Product Leaders</h2>
            <p className="text-xl text-gray-600">Join thousands of PMs who've elevated their communication skills</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">
                  &quot;Loopie AI helped me nail my Series A pitch. The investor Q&amp;A practice was incredibly realistic and
                  prepared me for every tough question.&quot;
                </p>
                <div className="flex items-center">
                  <img
                    src="/placeholder.svg?height=40&width=40"
                    alt="Sarah Chen"
                    className="w-10 h-10 rounded-full mr-3"
                  />
                  <div>
                    <p className="font-semibold">Sarah Chen</p>
                    <p className="text-sm text-gray-500">VP Product, TechCorp</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">
                  &quot;The executive meeting scenarios are spot-on. I went from dreading board meetings to confidently
                  presenting our quarterly results.&quot;
                </p>
                <div className="flex items-center">
                  <img
                    src="/placeholder.svg?height=40&width=40"
                    alt="Michael Rodriguez"
                    className="w-10 h-10 rounded-full mr-3"
                  />
                  <div>
                    <p className="font-semibold">Michael Rodriguez</p>
                    <p className="text-sm text-gray-500">Senior PM, StartupXYZ</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">
                  &quot;Landed my dream PM role after practicing with Loopie AI. The mock interviews were more challenging
                  than the real thing!&quot;
                </p>
                <div className="flex items-center">
                  <img
                    src="/placeholder.svg?height=40&width=40"
                    alt="Emily Johnson"
                    className="w-10 h-10 rounded-full mr-3"
                  />
                  <div>
                    <p className="font-semibold">Emily Johnson</p>
                    <p className="text-sm text-gray-500">Product Manager, BigTech</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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