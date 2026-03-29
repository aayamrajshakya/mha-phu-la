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

  // Fetch feed posts with author info and like counts (left join only — no !inner)
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      user:profiles!posts_user_id_fkey(id, name, avatar_url, age, gender, bio),
      likes:post_likes(count)
    `)
    .neq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(30)

  // Separately fetch which of these posts the current user has liked
  const postIds = (posts ?? []).map(p => p.id)
  const { data: myLikes } = postIds.length
    ? await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user!.id)
        .in('post_id', postIds)
    : { data: [] }

  const likedSet = new Set((myLikes ?? []).map(l => l.post_id))

  // Normalize likes and mark suggested posts
  const normalizedPosts = (posts ?? []).map(p => ({
    ...p,
    likes_count: p.likes?.[0]?.count ?? 0,
    is_liked: likedSet.has(p.id),
    is_suggested: p.user_id !== user!.id && !connectedUserIds.has(p.user_id),
  }))

  return <FeedClient posts={normalizedPosts} currentUser={profile} />
}
