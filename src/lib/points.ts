/**
 * Points rules, tiers, and gentle wellbeing-day tracking.
 *
 * Design principles:
 *  - No punishment for inactivity — days are additive, never subtracted
 *  - No competitive leaderboards
 *  - Warm, supportive copy at every callsite
 *  - Sensitive participation is never surfaced in points
 */

// ---------------------------------------------------------------------------
// Point amounts per action
// ---------------------------------------------------------------------------
export const POINT_RULES = {
  outing_complete:       50,  // both participants on a verified friend outing
  post_created:           5,  // capped to once per calendar day
  event_registered:      10,  // registering interest in an event
  reflection_completed:  15,  // filling in a post-event reflection
} as const

export type PointReason = keyof typeof POINT_RULES

// ---------------------------------------------------------------------------
// Redemption tiers  (ascending by cost)
// ---------------------------------------------------------------------------
export const REDEMPTION_TIERS = [
  {
    points:  75,
    type:    'walk'   as const,
    label:   'Wellness reward',
    desc:    'Free wellness item at partner stores',
    emoji:   '🚶',
  },
  {
    points:  100,
    type:    'coffee' as const,
    label:   'Coffee discount',
    desc:    '20% off at Starbucks',
    emoji:   '☕',
  },
  {
    points:  150,
    type:    'movies' as const,
    label:   'Movie discount',
    desc:    '15% off at TGV Cinemas',
    emoji:   '🎬',
  },
  {
    points:  200,
    type:    'food'   as const,
    label:   'Food discount',
    desc:    '10% off at partner restaurants',
    emoji:   '🍜',
  },
] as const

// ---------------------------------------------------------------------------
// Community contribution tier  (derived — not stored, not competitive)
// ---------------------------------------------------------------------------
export type ContributionTier = 'New member' | 'Regular' | 'Active contributor' | 'Community pillar'

export function getContributionTier(
  postCount: number,
  reflectionCount: number,
  outingCount: number,
): ContributionTier {
  const score = postCount * 2 + reflectionCount * 4 + outingCount * 8
  if (score >= 60) return 'Community pillar'
  if (score >= 25) return 'Active contributor'
  if (score >= 8)  return 'Regular'
  return 'New member'
}

// ---------------------------------------------------------------------------
// Gentle "wellbeing days" tracker (localStorage, client-only)
//
// Records the calendar dates on which the user did something positive.
// Shown as "You've shown up X days this month" — never counts down.
// ---------------------------------------------------------------------------
const ACTIVITY_KEY = 'mhafu_activity_days'

export function recordActivityDay(): void {
  if (typeof window === 'undefined') return
  try {
    const today = new Date().toISOString().slice(0, 10)
    const stored = localStorage.getItem(ACTIVITY_KEY)
    const days: string[] = stored ? JSON.parse(stored) : []
    if (days.includes(today)) return
    days.push(today)
    // Keep only the last 60 days to avoid unbounded growth
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 60)
    const trimmed = days.filter(d => new Date(d) >= cutoff)
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(trimmed))
  } catch { /* ignore */ }
}

export function getWellbeingDaysThisMonth(): number {
  if (typeof window === 'undefined') return 0
  try {
    const stored = localStorage.getItem(ACTIVITY_KEY)
    if (!stored) return 0
    const days: string[] = JSON.parse(stored)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return days.filter(d => new Date(d) >= thirtyDaysAgo).length
  } catch { return 0 }
}
