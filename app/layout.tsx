import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Loopie - AI Interview Practice',
  description: 'Practice interviews and get AI-powered feedback with Loopie',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-white">
      <body className={`${inter.className} bg-white`}>
        <header className="py-4 px-6 sm:px-8 w-full bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <Link href="/" className="flex items-baseline">
                <h1 className="text-2xl font-bold text-indigo-600">Loopie</h1>
                <span className="ml-3 text-xs sm:text-sm text-gray-500 hidden md:inline">
                  AI coach for product manager interviews
                </span>
              </Link>
            </div>

            <nav>
              <Link 
                href="/about"
                className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
              >
                About
              </Link>
            </nav>
          </div>
        </header>
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </body>
    </html>
  )
} 