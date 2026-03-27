export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RewardsClient from '@/components/rewards/RewardsClient'

export default async function RewardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

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
    ...(connections ?? []).map((c: { user: unknown }) => c.user),
    ...(receivedConnections ?? []).map((c: { user: unknown }) => c.user),
  ].filter(Boolean) as { id: string; name: string; avatar_url: string | null }[]

  return <RewardsClient friends={friends} currentUserId={user.id} />
}
