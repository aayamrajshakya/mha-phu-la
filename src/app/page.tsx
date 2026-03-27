import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 px-4">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="bg-violet-600 text-white rounded-2xl p-3">
            <Heart className="w-8 h-8" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">MindBridge</h1>
        <p className="text-lg text-gray-600 mb-2">
          A safe space to connect, share, and heal — together.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Find people nearby who understand what you&apos;re going through. No judgment, just support.
        </p>

        <div className="flex flex-col gap-3">
          <Link href="/auth?mode=signup">
            <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-full h-12 text-base font-semibold">
              Get started
            </Button>
          </Link>
          <Link href="/auth?mode=login">
            <Button variant="outline" className="w-full rounded-full h-12 text-base font-semibold border-violet-200 text-violet-700 hover:bg-violet-50">
              I already have an account
            </Button>
          </Link>
        </div>

        <div className="mt-10 flex items-center justify-center gap-6 text-sm text-gray-400">
          <span>🔒 Anonymous friendly</span>
          <span>💙 Peer support</span>
          <span>📍 Nearby people</span>
        </div>
      </div>
    </div>
  )
}
