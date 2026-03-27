export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RewardsClient from '@/components/rewards/RewardsClient'

export default async function RewardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  // Fetch outings where user is creator or partner
  const { data: creatorOutings } = await supabase
    .from('outings')
    .select('*, partner:profiles!outings_partner_id_fkey(id, name, avatar_url)')
    .eq('creator_id', user.id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  const { data: partnerOutings } = await supabase
    .from('outings')
    .select('*, partner:profiles!outings_creator_id_fkey(id, name, avatar_url)')
    .eq('partner_id', user.id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  const outings = [
    ...(creatorOutings ?? []).map(o => ({ ...o, is_creator: true })),
    ...(partnerOutings ?? []).map(o => ({ ...o, is_creator: false })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Fetch accepted connections to populate "plan outing" picker
  const { data: connections } = await supabase
    .from('connections')
    .select('*, user:profiles!connections_receiver_id_fkey(id, name, avatar_url)')
    .eq('requester_id', user.id)
    .eq('status', 'accepted')

  const { data: receivedConnections } = await supabase
    .from('connections')
    .select('*, user:profiles!connections_requester_id_fkey(id, name, avatar_url)')
    .eq('receiver_id', user.id)
    .eq('status', 'accepted')

  const friends = [
    ...(connections ?? []).map(c => c.user),
    ...(receivedConnections ?? []).map(c => c.user),
  ].filter(Boolean)

  return <RewardsClient outings={outings} friends={friends} currentUserId={user.id} />
}
