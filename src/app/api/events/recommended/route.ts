/**
 * GET /api/events/recommended
 *
 * Returns ranked personalized events for the authenticated user.
 *
 * Server-accessible signals used here:
 *   - profile: lat, lng (location score)
 *   - posts: mood_tag values (behavioral/sentiment signal)
 *
 * Client-private signals (passed as query params, never stored server-side):
 *   - interests    comma-separated interest strings
 *   - groupSize    small | large | any
 *   - vibe         active | quiet | any
 *   - format       virtual | offline | any
 *   - timing       weekday | weekend | any
 *   - radius       number in miles (default 5)
 *   - behavior     JSON: { [eventId]: "viewed"|"saved"|"registered"|"dismissed" }
 *
 * Privacy:
 *   - Support preferences are optional and never logged or persisted
 *   - No diagnosis is inferred; only general interest/activity matching
 *   - behavior param is ephemeral (not stored)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEvents } from '@/lib/events'
import { scoreEvents, UserContext, SupportPrefs, DEFAULT_SUPPORT_PREFS, EventBehavior } from '@/lib/recommend'

export async function GET(req: NextRequest) {
  // Auth
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse query params
  const { searchParams } = req.nextUrl
  const limitParam = Number(searchParams.get('limit') ?? '10')
  const limit = Math.min(Math.max(1, limitParam), 50)
  const radiusMi = Number(searchParams.get('radius') ?? '5')

  const interestsParam = searchParams.get('interests')
  const interests: string[] = interestsParam ? interestsParam.split(',').map(s => s.trim()).filter(Boolean) : []

  const supportPrefs: SupportPrefs = {
    groupSize: (searchParams.get('groupSize') as SupportPrefs['groupSize']) ?? DEFAULT_SUPPORT_PREFS.groupSize,
    vibe:      (searchParams.get('vibe')      as SupportPrefs['vibe'])      ?? DEFAULT_SUPPORT_PREFS.vibe,
    format:    (searchParams.get('format')    as SupportPrefs['format'])    ?? DEFAULT_SUPPORT_PREFS.format,
    timing:    (searchParams.get('timing')    as SupportPrefs['timing'])    ?? DEFAULT_SUPPORT_PREFS.timing,
  }

  let behavior: EventBehavior = {}
  const behaviorParam = searchParams.get('behavior')
  if (behaviorParam) {
    try { behavior = JSON.parse(decodeURIComponent(behaviorParam)) } catch {}
  }

  // Fetch profile for lat/lng
  const { data: profile } = await supabase
    .from('profiles')
    .select('lat, lng')
    .eq('id', user.id)
    .single()

  // Fetch recent posts for mood signal (last 20, mood_tag only)
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('content, mood_tag')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Build mood signal: combine mood_tags + post content keywords
  const postMoodTags: string[] = []
  for (const post of recentPosts ?? []) {
    if (post.mood_tag) postMoodTags.push(post.mood_tag)
    if (post.content) postMoodTags.push(post.content.slice(0, 100)) // first 100 chars for keyword scanning
  }

  // Build user context
  const ctx: UserContext = {
    interests,
    supportPrefs,
    lat: profile?.lat ?? null,
    lng: profile?.lng ?? null,
    radiusMi,
    postMoodTags,
    behavior,
    // Client-only signals — passed as params when available, else empty defaults
    vibeCardIds: [],
    scenarioAnswers: {},
    sessionIntention: null,
    reflections: {},
  }

  // Generate events (seeded — same set every call for consistency)
  const events = generateEvents(50)

  // Score and rank
  const scored = scoreEvents(events, ctx).slice(0, limit)

  return NextResponse.json({
    userId: user.id,
    count: scored.length,
    radiusMi,
    recommendations: scored.map(s => ({
      event: s.event,
      score: s.score,
      explanation: s.explanation,
      distanceKm: s.distanceKm,
      breakdown: s.breakdown,
    })),
    // LLM enrichment hint: pass these to WebLLM for richer explanations
    _llmContext: {
      interests,
      postCount: recentPosts?.length ?? 0,
      hasMoodSignal: postMoodTags.length > 0,
      note: 'Feed top recommendations + user bio to llm-prompts.buildRecommendationExplanationPrompt for LLM-enhanced explanations',
    },
  })
}
