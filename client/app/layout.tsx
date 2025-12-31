import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Content Factory | Blog Generation',
  description: 'Generate high-quality, SEO-optimized blog posts',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} font-sans min-h-screen bg-background`}>
        {children}
      </body>
    </html>
  )
}
