'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Heart, Loader2 } from 'lucide-react'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') ?? 'login'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Check your email to confirm your account, then log in.')
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        // Check if profile is already set up
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', data.user.id)
          .single()
        router.push(profile?.name ? '/feed' : '/onboarding')
        router.refresh()
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 px-4">
      <Card className="w-full max-w-sm shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="bg-yellow-400 text-gray-900 rounded-2xl p-2.5">
              <Heart className="w-6 h-6" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {mode === 'signup' ? 'Join Mha Phu La?' : 'Welcome back'}
          </CardTitle>
          <CardDescription>
            {mode === 'signup'
              ? 'Start your journey to better mental health'
              : 'Sign in to your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-2">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="h-11 rounded-xl"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="h-11 rounded-xl"
            />
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            {message && <p className="text-sm text-green-600 text-center">{message}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="h-11 rounded-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-gray-900 font-semibold mt-1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'signup' ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            {mode === 'signup' ? (
              <>Already have an account?{' '}
                <Link href="/auth?mode=login" className="text-yellow-400 font-medium hover:underline">Sign in</Link>
              </>
            ) : (
              <>Don&apos;t have an account?{' '}
                <Link href="/auth?mode=signup" className="text-yellow-400 font-medium hover:underline">Sign up</Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}
