import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Mic, ArrowLeft, Brain, Star, Clock, TrendingUp, FileText } from "lucide-react"
import Link from "next/link"

export default function InterviewSelectionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Loopie AI</span>
          </Link>
          <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-20">
        {/* Interview Selection Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl w-full mx-auto">
          {/* Product Sense - Active */}
          <div className="w-80">
            <Card 
              className="border-2 border-purple-300 shadow-xl bg-gradient-to-r from-purple-50 to-pink-50 flex flex-col h-full"
              style={{ borderRadius: '0.75rem' }}
            >
              <CardHeader className="text-center pb-4 relative">
                <Badge className="absolute top-4 right-4 bg-green-100 text-green-700 hover:bg-green-100 flex items-center">
                  <Star className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-2xl mb-2">Product Sense</CardTitle>
                <CardDescription className="text-base">
                  Practice product thinking and strategy.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4 flex-1 flex flex-col justify-center">
                <div className="text-center">
                  <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">30-45 minutes</p>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-6">
                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-base py-3 h-auto"
                  style={{ borderRadius: '0.5rem' }}
                  asChild
                >
                  <Link href="/pre-interview">Select Interview</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Seed Pitch - Coming Soon */}
          <div className="w-80">
            <Card 
              className="border-2 border-gray-200 shadow-md bg-gradient-to-r from-gray-50 to-gray-100 flex flex-col opacity-60 h-full"
              style={{ borderRadius: '0.75rem' }}
            >
              <CardHeader className="text-center pb-4 relative">
                <Badge className="absolute top-4 right-4 bg-gray-100 text-gray-500 hover:bg-gray-100 flex items-center">
                  Coming Soon
                </Badge>
                <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-2xl mb-2 text-gray-600">Seed Pitch</CardTitle>
                <CardDescription className="text-base text-gray-500">
                  Practice pitching your startup idea to investors.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4 flex-1 flex flex-col justify-center">
                <div className="text-center">
                  <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-500">15-20 minutes</p>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-6">
                <Button 
                  className="w-full bg-gray-400 text-white text-base py-3 h-auto cursor-not-allowed" 
                  style={{ borderRadius: '0.5rem' }}
                  disabled
                >
                  Coming Soon
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Product Reviews - Coming Soon */}
          <div className="w-80">
            <Card 
              className="border-2 border-gray-200 shadow-md bg-gradient-to-r from-gray-50 to-gray-100 flex flex-col opacity-60 h-full"
              style={{ borderRadius: '0.75rem' }}
            >
              <CardHeader className="text-center pb-4 relative">
                <Badge className="absolute top-4 right-4 bg-gray-100 text-gray-500 hover:bg-gray-100 flex items-center">
                  Coming Soon
                </Badge>
                <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-2xl mb-2 text-gray-600">Product Reviews</CardTitle>
                <CardDescription className="text-base text-gray-500">
                  Practice presenting reviews to execs.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4 flex-1 flex flex-col justify-center">
                <div className="text-center">
                  <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-500">45-60 minutes</p>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-6">
                <Button 
                  className="w-full bg-gray-400 text-white text-base py-3 h-auto cursor-not-allowed" 
                  style={{ borderRadius: '0.5rem' }}
                  disabled
                >
                  Coming Soon
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 