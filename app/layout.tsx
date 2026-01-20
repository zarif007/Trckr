import type { Metadata } from 'next'
import { Geist, Geist_Mono, Inter, Space_Grotesk } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import NavBar from './components/NavBar'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
})

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Trckr — AI-generated, customizable trackers',
  description:
    'Describe what you want to track and Trckr generates a tailored tracking board with fields, views, reminders, and helpful suggestions.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="light"
          enableSystem={false}
          storageKey="trckr-theme"
        >
          <NavBar />
          <main className="max-w-full mx-auto pt-16">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
