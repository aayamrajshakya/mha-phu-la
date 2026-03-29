import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/outings — list the current user's outings with partner profile
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('outings')
    .select(`
      *,
      creator:profiles!outings_creator_id_fkey(id, name, avatar_url),
      partner:profiles!outings_partner_id_fkey(id, name, avatar_url)
    `)
    .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ outings: data ?? [] })
}

// POST /api/outings — create a new outing
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { partner_id, type } = await req.json()
  if (!partner_id || !type) {
    return NextResponse.json({ error: 'partner_id and type are required' }, { status: 400 })
  }

  const validTypes = ['coffee', 'movies', 'food', 'walk']
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: 'Invalid outing type' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('outings')
    .insert({ creator_id: user.id, partner_id, type })
    .select(`
      *,
      creator:profiles!outings_creator_id_fkey(id, name, avatar_url),
      partner:profiles!outings_partner_id_fkey(id, name, avatar_url)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ outing: data }, { status: 201 })
}
