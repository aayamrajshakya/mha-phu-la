import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/outings/[id]/checkin — generate a 6-digit check-in code (creator only)
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the caller is the creator
  const { data: outing, error: fetchErr } = await supabase
    .from('outings')
    .select('id, creator_id, status')
    .eq('id', id)
    .single()

  if (fetchErr || !outing) return NextResponse.json({ error: 'Outing not found' }, { status: 404 })
  if (outing.creator_id !== user.id) return NextResponse.json({ error: 'Only the creator can generate a code' }, { status: 403 })
  if (outing.status !== 'pending') return NextResponse.json({ error: 'Outing is not pending' }, { status: 400 })

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const { error } = await supabase
    .from('outings')
    .update({ checkin_code: code, checkin_code_expires_at: expires })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ code, expires_at: expires })
}
