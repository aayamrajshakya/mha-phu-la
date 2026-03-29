export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RewardsClient from '@/components/rewards/RewardsClient'
import { type PointEvent } from '@/types'

export default async function RewardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  // Friends for planning outings
  const [{ data: sent }, { data: received }] = await Promise.all([
    supabase
      .from('connections')
      .select('*, user:profiles!connections_receiver_id_fkey(id, name, avatar_url)')
      .eq('requester_id', user.id)
      .eq('status', 'accepted'),
    supabase
      .from('connections')
      .select('*, user:profiles!connections_requester_id_fkey(id, name, avatar_url)')
      .eq('receiver_id', user.id)
      .eq('status', 'accepted'),
  ])

  const friends = [
    ...(sent    ?? []).map((c: { user: unknown }) => c.user),
    ...(received ?? []).map((c: { user: unknown }) => c.user),
  ].filter(Boolean) as { id: string; name: string; avatar_url: string | null }[]

  // Real outings from Supabase
  const { data: outingsRaw } = await supabase
    .from('outings')
    .select(`
      *,
      creator:profiles!outings_creator_id_fkey(id, name, avatar_url),
      partner:profiles!outings_partner_id_fkey(id, name, avatar_url)
    `)
    .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  // User's current points + last 5 events
  const { data: profile } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', user.id)
    .single()

  const { data: pointEventsRaw } = await supabase
    .from('point_events')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Post + outing counts for contribution tier
  const [{ count: postCount }, { count: outingCount }, { count: reflectionCount }] = await Promise.all([
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('outings').select('id', { count: 'exact', head: true })
      .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`).eq('status', 'completed'),
    supabase.from('point_events').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('reason', 'reflection_completed'),
  ])

  return (
    <RewardsClient
      friends={friends}
      currentUserId={user.id}
      initialOutings={outingsRaw ?? []}
      userPoints={profile?.points ?? 0}
      pointEvents={(pointEventsRaw ?? []) as PointEvent[]}
      postCount={postCount ?? 0}
      outingCount={outingCount ?? 0}
      reflectionCount={reflectionCount ?? 0}
    />
  )
}
