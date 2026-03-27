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

  return (
    <ProfileClient
      profile={profile}
      posts={(posts ?? []).map(p => ({ ...p, likes_count: p.likes?.[0]?.count ?? 0 }))}
    />
  )
}
