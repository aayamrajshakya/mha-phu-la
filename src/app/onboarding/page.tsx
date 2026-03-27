'use client'

import dynamic from 'next/dynamic'

// Disable SSR so Supabase browser client isn't instantiated at build time
const OnboardingInner = dynamic(() => import('./OnboardingInner'), { ssr: false })

export default function OnboardingPage() {
  return <OnboardingInner />
}
