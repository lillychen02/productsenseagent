import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

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
        <header className="py-4 px-6 sm:px-8 w-full bg-white shadow-sm">
          <div className="flex items-baseline">
            <h1 className="text-2xl font-bold text-indigo-600">Loopie</h1>
            <span className="ml-3 text-xs sm:text-sm text-gray-500">AI coach for product manager interviews</span>
          </div>
        </header>
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </body>
    </html>
  )
} 