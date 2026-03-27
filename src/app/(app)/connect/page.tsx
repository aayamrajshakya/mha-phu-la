export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConnectClient from '@/components/connect/ConnectClient'

export default async function ConnectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const { data: connections } = await supabase
    .from('connections')
    .select(`
      *,
      requester:profiles!connections_requester_id_fkey(id, name, avatar_url, mood, bio, age),
      receiver:profiles!connections_receiver_id_fkey(id, name, avatar_url, mood, bio, age)
    `)
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)

  return <ConnectClient currentUser={profile} initialConnections={connections ?? []} />
}
