import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Loopie - AI Interview Coach',
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
        {children}
      </body>
    </html>
  )
} 