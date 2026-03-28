/**
 * Hybrid recommendation engine for Mha Phu La? events.
 *
 * Architecture: rule-based scoring + structured signals.
 * LLM layer (WebLLM) sits on top for text understanding — see llm-prompts.ts.
 *
 * final_score = 0.30×interest + 0.20×support + 0.15×eventPref + 0.20×behavior + 0.15×location
 */

import { MHEvent, EventCategory } from './events'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SupportPrefs {
  groupSize: 'small' | 'large' | 'any'
  vibe: 'active' | 'quiet' | 'any'
  format: 'virtual' | 'offline' | 'any'
  timing: 'weekday' | 'weekend' | 'any'
}

export type InteractionType = 'viewed' | 'saved' | 'registered' | 'dismissed'
export type EventBehavior = Record<string, InteractionType>

export interface UserContext {
  interests: string[]          // from localStorage mhafu_interests
  supportPrefs: SupportPrefs   // from localStorage mhafu_support_prefs
  lat: number | null
  lng: number | null
  radiusMi: number
  postMoodTags: string[]       // mood_tag values from recent posts
  behavior: EventBehavior      // from localStorage mhafu_event_interactions
}

export interface ScoreBreakdown {
  interest: number
  support: number
  eventPref: number
  behavior: number
  location: number
  total: number
}

export interface ScoredEvent {
  event: MHEvent
  score: number
  breakdown: ScoreBreakdown
  explanation: string
  distanceKm: number | null
}

// ---------------------------------------------------------------------------
// Weights
// ---------------------------------------------------------------------------

const WEIGHTS = {
  interest:   0.30,
  support:    0.20,
  eventPref:  0.15,
  behavior:   0.20,
  location:   0.15,
}

// ---------------------------------------------------------------------------
// Interest → tag vocabulary mapping
// Maps user's lifestyle interests to mental-health event tag space
// ---------------------------------------------------------------------------

const INTEREST_TAG_MAP: Record<string, string[]> = {
  'Yoga':        ['yoga', 'wellness', 'relaxation', 'physical health', 'anxiety'],
  'Meditation':  ['meditation', 'mindfulness', 'calm', 'breathing', 'stress relief'],
  'Art':         ['art', 'creativity', 'expression', 'healing', 'therapy'],
  'Music':       ['creativity', 'expression', 'healing'],
  'Sports':      ['exercise', 'physical health', 'outdoors', 'walking'],
  'Fitness':     ['exercise', 'physical health', 'wellness'],
  'Hiking':      ['outdoors', 'nature', 'walking', 'exercise'],
  'Nature':      ['outdoors', 'nature', 'walking', 'calm'],
  'Writing':     ['writing', 'journaling', 'reflection', 'self-care'],
  'Reading':     ['reflection', 'mindfulness', 'self-care', 'calm'],
  'Coffee':      ['social', 'connection', 'casual', 'friendship', 'community'],
  'Food':        ['social', 'connection', 'casual', 'community'],
  'Cooking':     ['self-care', 'social', 'creativity'],
  'Gaming':      ['community', 'social', 'casual'],
  'Travel':      ['outdoors', 'nature', 'adventure'],
  'Photography': ['creativity', 'outdoors', 'mindfulness'],
  'Cycling':     ['exercise', 'outdoors', 'physical health'],
  'Swimming':    ['exercise', 'wellness', 'physical health'],
  'Dancing':     ['exercise', 'social', 'expression', 'creativity'],
  'Theatre':     ['creativity', 'expression', 'social', 'community'],
  'Volunteering':['community', 'connection', 'peer support', 'social'],
  'Fashion':     ['creativity', 'expression', 'social'],
  'Board Games': ['social', 'community', 'casual', 'low pressure'],
  'Podcasts':    ['mindfulness', 'self-care', 'reflection', 'awareness'],
  'Meditation':  ['meditation', 'mindfulness', 'calm', 'breathing'],
}

// Mood → category affinity for behavior_score
const NEGATIVE_MOOD_BOOSTS: EventCategory[] = [
  'Support Group', 'Counseling', 'Mindfulness', 'Meditation', 'Grief Support', 'Crisis Support',
]
const POSITIVE_MOOD_BOOSTS: EventCategory[] = [
  'Coffee Chat', 'Walking Group', 'Yoga & Wellness', 'Art Therapy', 'Social Anxiety Meetup',
]
const NEGATIVE_MOOD_WORDS = ['sad', 'anxious', 'depressed', 'lonely', 'overwhelmed', 'grief', 'lost', 'hopeless', 'stressed', 'tired']
const POSITIVE_MOOD_WORDS = ['happy', 'great', 'good', 'excited', 'grateful', 'hopeful', 'motivated', 'better', 'positive']

// ---------------------------------------------------------------------------
// Haversine distance (km)
// ---------------------------------------------------------------------------

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ---------------------------------------------------------------------------
// Score components
// ---------------------------------------------------------------------------

function computeInterestScore(event: MHEvent, interests: string[]): number {
  if (interests.length === 0) return 0.5 // neutral default

  // Build user tag set from interest → tag mapping
  const userTags = new Set<string>()
  for (const interest of interests) {
    const mapped = INTEREST_TAG_MAP[interest] ?? []
    for (const t of mapped) userTags.add(t.toLowerCase())
  }

  const eventTags = new Set(event.tags.map(t => t.toLowerCase()))
  if (userTags.size === 0 || eventTags.size === 0) return 0.5

  // Jaccard similarity
  let intersection = 0
  for (const t of eventTags) {
    if (userTags.has(t)) intersection++
  }
  const union = userTags.size + eventTags.size - intersection
  return intersection / union
}

function computeSupportScore(event: MHEvent, prefs: SupportPrefs): number {
  let score = 1.0

  if (prefs.groupSize !== 'any' && event.groupSize !== prefs.groupSize) score -= 0.25
  if (prefs.vibe !== 'any' && event.vibe !== prefs.vibe) score -= 0.25
  if (prefs.format !== 'any' && event.format !== prefs.format) score -= 0.25
  if (prefs.timing !== 'any' && event.dayType !== prefs.timing) score -= 0.25

  return Math.max(0, score)
}

function computeEventPrefScore(event: MHEvent): number {
  if (event.spotsLeft === 0) return 0.1 // almost penalize full events

  const spotsRatio = event.spotsLeft / event.capacity
  let score = 0.3 + spotsRatio * 0.4 // 0.3 (full) → 0.7 (empty)

  // Urgency bonus: events within next 3 days
  const daysAway = (new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (daysAway <= 1) score += 0.2
  else if (daysAway <= 3) score += 0.1

  // Social proof: >60% registered
  const fillRate = (event.capacity - event.spotsLeft) / event.capacity
  if (fillRate > 0.6 && event.spotsLeft > 0) score += 0.1

  return Math.min(1, score)
}

function computeBehaviorScore(event: MHEvent, behavior: EventBehavior, postMoodTags: string[]): number {
  let score = 0.5 // neutral baseline

  // Category affinity from past interactions
  const interactedCategories: Record<EventCategory | string, InteractionType[]> = {}
  for (const [id, type] of Object.entries(behavior)) {
    // id format: "evt-N-XXXX", we don't have category here — handled in EventsClient
    // This function receives pre-aggregated category signals; use behavior on this specific event
    if (id === event.id) {
      if (type === 'registered') score = Math.min(1, score + 0.3)
      if (type === 'saved') score = Math.min(1, score + 0.2)
      if (type === 'viewed') score = Math.min(1, score + 0.1)
      if (type === 'dismissed') return 0.0 // hard penalize
    }
  }

  // Mood signal from recent posts
  if (postMoodTags.length > 0) {
    const allText = postMoodTags.join(' ').toLowerCase()
    const isNegative = NEGATIVE_MOOD_WORDS.some(w => allText.includes(w))
    const isPositive = POSITIVE_MOOD_WORDS.some(w => allText.includes(w))

    if (isNegative && NEGATIVE_MOOD_BOOSTS.includes(event.category)) score = Math.min(1, score + 0.25)
    if (isPositive && POSITIVE_MOOD_BOOSTS.includes(event.category)) score = Math.min(1, score + 0.2)
  }

  return score
}

function computeBehaviorScoreWithCategoryHistory(
  event: MHEvent,
  behavior: EventBehavior,
  categoryHistory: Record<string, InteractionType[]>,
  postMoodTags: string[],
): number {
  let score = 0.5

  // Direct event interaction
  const direct = behavior[event.id]
  if (direct === 'dismissed') return 0.0
  if (direct === 'registered') score += 0.3
  if (direct === 'saved') score += 0.2
  if (direct === 'viewed') score += 0.1

  // Category history
  const catHistory = categoryHistory[event.category] ?? []
  if (catHistory.includes('registered')) score = Math.min(1, score + 0.2)
  if (catHistory.includes('saved')) score = Math.min(1, score + 0.1)
  if (catHistory.includes('dismissed') && !direct) score = Math.max(0, score - 0.3)

  // Mood signal
  if (postMoodTags.length > 0) {
    const allText = postMoodTags.join(' ').toLowerCase()
    const isNegative = NEGATIVE_MOOD_WORDS.some(w => allText.includes(w))
    const isPositive = POSITIVE_MOOD_WORDS.some(w => allText.includes(w))
    if (isNegative && NEGATIVE_MOOD_BOOSTS.includes(event.category)) score = Math.min(1, score + 0.25)
    if (isPositive && POSITIVE_MOOD_BOOSTS.includes(event.category)) score = Math.min(1, score + 0.2)
  }

  return Math.max(0, Math.min(1, score))
}

function computeLocationScore(event: MHEvent, userLat: number | null, userLng: number | null, radiusMi: number): { score: number; distanceKm: number | null } {
  if (userLat == null || userLng == null) return { score: 0.5, distanceKm: null }

  const distanceKm = haversineKm(userLat, userLng, event.lat, event.lng)
  const radiusKm = radiusMi * 1.60934

  if (distanceKm <= radiusKm) {
    // Within radius: score from 1.0 (at center) to 0.5 (at edge)
    const score = 1.0 - (distanceKm / radiusKm) * 0.5
    return { score, distanceKm }
  } else if (distanceKm <= radiusKm * 2) {
    // Just outside radius: score 0.5 → 0
    const score = 0.5 * (1 - (distanceKm - radiusKm) / radiusKm)
    return { score: Math.max(0, score), distanceKm }
  }

  return { score: 0, distanceKm }
}

// ---------------------------------------------------------------------------
// Explanation generator (rule-based; LLM can override via llm-prompts.ts)
// ---------------------------------------------------------------------------

function buildExplanation(breakdown: ScoreBreakdown, event: MHEvent, distanceKm: number | null): string {
  const reasons: string[] = []

  if (breakdown.interest >= 0.25) reasons.push(`matches your interests`)
  if (breakdown.support >= 0.75) reasons.push(`fits your ${event.groupSize} group preference`)
  if (breakdown.location >= 0.8 && distanceKm != null) reasons.push(`only ${distanceKm.toFixed(1)} km away`)
  if (breakdown.behavior >= 0.7) reasons.push(`aligns with your activity`)
  if (breakdown.eventPref >= 0.7 && event.spotsLeft > 0) reasons.push(`${event.spotsLeft} spots still open`)

  if (reasons.length === 0) return `Recommended for you`
  return reasons[0][0].toUpperCase() + reasons[0].slice(1) + (reasons.length > 1 ? ` · ${reasons.slice(1).join(' · ')}` : '')
}

// ---------------------------------------------------------------------------
// Main export: scoreEvents
// ---------------------------------------------------------------------------

export function scoreEvents(events: MHEvent[], ctx: UserContext): ScoredEvent[] {
  // Pre-compute category history from behavior map + events list
  const categoryHistory: Record<string, InteractionType[]> = {}
  for (const [id, type] of Object.entries(ctx.behavior)) {
    const match = events.find(e => e.id === id)
    if (match) {
      if (!categoryHistory[match.category]) categoryHistory[match.category] = []
      categoryHistory[match.category].push(type)
    }
  }

  return events
    .map(event => {
      const interest  = computeInterestScore(event, ctx.interests)
      const support   = computeSupportScore(event, ctx.supportPrefs)
      const eventPref = computeEventPrefScore(event)
      const behavior  = computeBehaviorScoreWithCategoryHistory(event, ctx.behavior, categoryHistory, ctx.postMoodTags)
      const { score: location, distanceKm } = computeLocationScore(event, ctx.lat, ctx.lng, ctx.radiusMi)

      const total =
        WEIGHTS.interest   * interest +
        WEIGHTS.support    * support +
        WEIGHTS.eventPref  * eventPref +
        WEIGHTS.behavior   * behavior +
        WEIGHTS.location   * location

      const breakdown: ScoreBreakdown = { interest, support, eventPref, behavior, location, total }

      return {
        event,
        score: Math.round(total * 100) / 100,
        breakdown,
        explanation: buildExplanation(breakdown, event, distanceKm),
        distanceKm,
      }
    })
    .filter(s => s.breakdown.behavior > 0) // remove dismissed
    .sort((a, b) => b.score - a.score)
}

// ---------------------------------------------------------------------------
// Default support prefs (used when nothing is set in localStorage)
// ---------------------------------------------------------------------------

export const DEFAULT_SUPPORT_PREFS: SupportPrefs = {
  groupSize: 'any',
  vibe: 'any',
  format: 'any',
  timing: 'any',
}
