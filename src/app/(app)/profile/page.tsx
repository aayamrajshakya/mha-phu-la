export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileClient from '@/components/profile/ProfileClient'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: posts } = await supabase
    .from('posts')
    .select(`*, likes:post_likes(count)`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const [{ data: sentConns }, { data: receivedConns }] = await Promise.all([
    supabase
      .from('connections')
      .select('receiver:profiles!connections_receiver_id_fkey(id, name, avatar_url, mood)')
      .eq('requester_id', user.id)
      .eq('status', 'accepted'),
    supabase
      .from('connections')
      .select('requester:profiles!connections_requester_id_fkey(id, name, avatar_url, mood)')
      .eq('receiver_id', user.id)
      .eq('status', 'accepted'),
  ])

  const friends = [
    ...((sentConns ?? []).map((c: { receiver: unknown }) => c.receiver)),
    ...((receivedConns ?? []).map((c: { requester: unknown }) => c.requester)),
  ] as { id: string; name: string; avatar_url: string | null; mood: string | null }[]

  return (
    <ProfileClient
      profile={profile}
      posts={(posts ?? []).map(p => ({ ...p, likes_count: p.likes?.[0]?.count ?? 0 }))}
      friends={friends}
    />
  )
}
