export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import FeedClient from '@/components/feed/FeedClient'

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch current user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  // Fetch accepted connections to determine friend vs suggested posts
  const { data: sentConnections } = await supabase
    .from('connections')
    .select('receiver_id')
    .eq('requester_id', user!.id)
    .eq('status', 'accepted')

  const { data: receivedConnections } = await supabase
    .from('connections')
    .select('requester_id')
    .eq('receiver_id', user!.id)
    .eq('status', 'accepted')

  const connectedUserIds = new Set<string>([
    ...(sentConnections ?? []).map(c => c.receiver_id),
    ...(receivedConnections ?? []).map(c => c.requester_id),
  ])

  // Fetch feed posts with author info and like counts
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      user:profiles!posts_user_id_fkey(id, name, avatar_url),
      likes:post_likes(count),
      my_like:post_likes!inner(user_id)
    `)
    .order('created_at', { ascending: false })
    .limit(30)

  // Normalize likes and mark suggested posts
  const normalizedPosts = (posts ?? []).map(p => ({
    ...p,
    likes_count: p.likes?.[0]?.count ?? 0,
    is_liked: (p.my_like ?? []).some((l: { user_id: string }) => l.user_id === user!.id),
    is_suggested: p.user_id !== user!.id && !connectedUserIds.has(p.user_id),
  }))

  return <FeedClient posts={normalizedPosts} currentUser={profile} />
}
