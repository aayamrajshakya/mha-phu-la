import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { POINT_RULES, type PointReason } from '@/lib/points'

// POST /api/points — award points for client-side actions (post, event, reflection).
// Outing points are handled by the DB function; this handles the rest.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reason, reference_id } = await req.json() as { reason: PointReason; reference_id?: string }

  const validReasons: PointReason[] = ['post_created', 'event_registered', 'reflection_completed']
  if (!validReasons.includes(reason)) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
  }

  // For post_created: only award once per calendar day
  if (reason === 'post_created') {
    const today = new Date().toISOString().slice(0, 10)
    const { count } = await supabase
      .from('point_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('reason', 'post_created')
      .gte('created_at', `${today}T00:00:00Z`)

    if ((count ?? 0) > 0) {
      return NextResponse.json({ skipped: true, reason: 'already_awarded_today' })
    }
  }

  const amount = POINT_RULES[reason]

  const { error } = await supabase.rpc('award_points', {
    p_user_id:      user.id,
    p_amount:       amount,
    p_reason:       reason,
    p_reference_id: reference_id ?? null,
  })

  if (error) {
    // Fallback: insert event + read-then-increment (migration not yet applied)
    await supabase.from('point_events').insert({
      user_id: user.id, amount, reason, reference_id: reference_id ?? null,
    })
    const { data: profile } = await supabase
      .from('profiles').select('points').eq('id', user.id).single()
    await supabase.from('profiles')
      .update({ points: (profile?.points ?? 0) + amount })
      .eq('id', user.id)
  }

  return NextResponse.json({ awarded: amount })
}
