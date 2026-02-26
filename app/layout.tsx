import type { Metadata } from 'next'
import { Geist, Geist_Mono, IBM_Plex_Mono, IBM_Plex_Sans, Inter, Space_Grotesk } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { TeamProvider } from '@/lib/teams'
import { AuthProvider } from './components/AuthProvider'
import NavBarWrapper from './components/NavBarWrapper'
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

/* E2B-style: IBM Plex Sans + IBM Plex Mono */
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
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
        className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${geistSans.variable} ${geistMono.variable} ${inter.variable} ${spaceGrotesk.variable} antialiased overflow-x-hidden`}
      >
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="light"
          enableSystem={false}
          storageKey="trckr-theme"
        >
          <AuthProvider>
          <TeamProvider>
            <NavBarWrapper />
            <main className="max-w-full mx-auto">
              {children}
            </main>
          </TeamProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
