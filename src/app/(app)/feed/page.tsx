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

  // Fetch feed posts (connections + nearby) with author info and like counts
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

  // Normalize likes
  const normalizedPosts = (posts ?? []).map(p => ({
    ...p,
    likes_count: p.likes?.[0]?.count ?? 0,
    is_liked: (p.my_like ?? []).some((l: { user_id: string }) => l.user_id === user!.id),
  }))

  return <FeedClient posts={normalizedPosts} currentUser={profile} />
}
