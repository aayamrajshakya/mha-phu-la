import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/outings/[id]/verify — partner submits the 6-digit code.
// On success: marks outing completed, awards 50 pts to both users via security-definer fn.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 })

  // Generate the 8-char reward code before calling the DB function
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const rewardCode = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

  const { error } = await supabase.rpc('complete_outing_and_award_points', {
    p_outing_id:      id,
    p_submitted_code: code,
    p_reward_code:    rewardCode,
  })

  if (error) {
    // Surface DB-level validation messages to the client
    const msg = error.message ?? 'Verification failed'
    const status = msg.includes('Invalid code') || msg.includes('expired') ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }

  return NextResponse.json({ reward_code: rewardCode })
}
