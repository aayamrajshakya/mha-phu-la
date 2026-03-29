import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 px-4">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://stickershop.line-scdn.net/stickershop/v1/sticker/4809283/android/sticker.png?v=1"
            alt="Mha Phu La? logo"
            className="w-28 h-28 object-contain"
          />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Mha Phu La?</h1>
        <p className="text-lg text-gray-600 mb-2">
          A safe space to connect, share, and heal together.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Find people nearby who understand what you&apos;re going through. No judgment, just support.
        </p>

        <div className="flex flex-col gap-3">
          <Link href="/auth?mode=signup">
            <Button className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-full h-12 text-base font-semibold">
              Get started
            </Button>
          </Link>
          <Link href="/auth?mode=login">
            <Button variant="outline" className="w-full rounded-full h-12 text-base font-semibold border-yellow-400 text-gray-900 hover:bg-yellow-50">
              I already have an account
            </Button>
          </Link>
        </div>

      </div>
    </div>
  )
}
