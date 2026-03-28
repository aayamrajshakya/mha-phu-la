export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { generateEvents } from '@/lib/events'
import EventsClient from '@/components/events/EventsClient'

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [{ data: profile }, { data: recentPosts }] = await Promise.all([
    supabase.from('profiles').select('lat, lng').eq('id', user.id).single(),
    supabase.from('posts').select('content, mood_tag').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(20),
  ])

  // Build mood signal for behavior_score
  const postMoodTags: string[] = []
  for (const post of recentPosts ?? []) {
    if (post.mood_tag) postMoodTags.push(post.mood_tag)
    if (post.content) postMoodTags.push(post.content.slice(0, 100))
  }

  const events = generateEvents(30)

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 z-10">
        <h1 className="text-xl font-bold text-gray-900">Events</h1>
        <p className="text-xs text-gray-400 mt-0.5">Mental health events near you</p>
      </div>
      <EventsClient
        events={events}
        userLat={profile?.lat ?? null}
        userLng={profile?.lng ?? null}
        postMoodTags={postMoodTags}
      />
    </div>
  )
}
