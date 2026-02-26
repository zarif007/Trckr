import Link from 'next/link'
import { GoogleSignInButton } from './GoogleSignInButton'

type Props = { searchParams: Promise<{ callbackUrl?: string }> }

export default async function LoginPage({ searchParams }: Props) {
  const { callbackUrl = '/tracker' } = await searchParams

  return (
    <div className="min-h-screen font-sans bg-background text-foreground flex flex-col items-center justify-center relative overflow-hidden">
      {/* Subtle ambient glow – keeps the existing feel */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-foreground/[0.03] via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      {/* Card container */}
      <div className="relative z-10 w-full max-w-[400px] mx-auto px-4">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="group" aria-label="Go to home page">
            <div className="w-10 h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full text-foreground"
              >
                <path
                  d="M12 3L20 7.5L12 12L4 7.5L12 3Z"
                  fill="currentColor"
                  className="opacity-100"
                />
                <path
                  d="M12 12L20 7.5V16.5L12 21V12Z"
                  fill="currentColor"
                  className="opacity-70"
                />
                <path
                  d="M12 12L4 7.5V16.5L12 21V12Z"
                  fill="currentColor"
                  className="opacity-40"
                />
              </svg>
            </div>
          </Link>
        </div>

        {/* Sign-in card */}
        <div className="rounded-xl border border-border bg-card p-8 space-y-6">
          <div className="text-center space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight">Sign in to Trckr</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back. Sign in to continue.
            </p>
          </div>

          <GoogleSignInButton callbackUrl={callbackUrl} />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-3 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Footer links */}
          <div className="flex flex-col items-center gap-3">
            <Link
              href={callbackUrl}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Continue without signing in →
            </Link>
          </div>
        </div>

        {/* Bottom link */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
