import type { Metadata, Viewport } from 'next'
import { Inter, Oswald } from 'next/font/google'

import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const oswald = Oswald({
  weight: ['700'],
  subsets: ['latin'],
  variable: '--font-gothic',
})

export const metadata: Metadata = {
  title: "Même si c'est vrai, c'est faux.",
  description: 'A dark Tumblr-style image gallery with infinite scrolling',
}

export const viewport: Viewport = {
  themeColor: '#141820',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${oswald.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
