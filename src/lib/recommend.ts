/**
 * Hybrid recommendation engine for Mha Phu La? events.
 *
 * Architecture: rule-based scoring + structured signals.
 * LLM layer (WebLLM) sits on top for text understanding — see llm-prompts.ts.
 *
 * final_score =
 *   0.28 × interest_score      (interests + vibe card tags + scenario tags → Jaccard)
 *   0.18 × support_score       (groupSize / vibe / format / timing prefs)
 *   0.12 × eventPref_score     (availability, urgency, social proof)
 *   0.20 × behavior_score      (interaction history + category affinity + reflection signal)
 *   0.12 × location_score      (haversine distance decay)
 *   + intentionBonus           (up to +0.10 additive: session intention → category match)
 *   + vibeCardCategoryBonus    (up to +0.08 additive: vibe card → direct category match)
 */

import { MHEvent, EventCategory } from './events'
import {
  IntentionOption, INTENTION_OPTIONS,
  ReflectionData, VibeCard, VIBE_CARDS,
  vibeCardTagsFromIds, scenarioTagsFromAnswers, vibeCardCategoryBoosts,
} from './user-prefs'

// Re-export SupportPrefs so SideDrawer doesn't need to import from here AND user-prefs
export interface SupportPrefs {
  groupSize: 'small' | 'large' | 'any'
  vibe: 'active' | 'quiet' | 'any'
  format: 'virtual' | 'offline' | 'any'
  timing: 'weekday' | 'weekend' | 'any'
}

export const DEFAULT_SUPPORT_PREFS: SupportPrefs = {
  groupSize: 'any',
  vibe: 'any',
  format: 'any',
  timing: 'any',
}

export type InteractionType = 'viewed' | 'saved' | 'registered' | 'dismissed'
export type EventBehavior = Record<string, InteractionType>

export interface UserContext {
  // Core
  interests: string[]
  supportPrefs: SupportPrefs
  lat: number | null
  lng: number | null
  radiusMi: number
  postMoodTags: string[]
  behavior: EventBehavior

  // Extended preference signals (from user-prefs.ts)
  vibeCardIds: string[]            // selected vibe card IDs
  scenarioAnswers: Record<string, string> // scenario question → answer ID
  sessionIntention: string | null  // current session intention ID (sessionStorage)
  reflections: Record<string, ReflectionData>  // event feedback history
}

export interface ScoreBreakdown {
  interest: number
  support: number
  eventPref: number
  behavior: number
  location: number
  intentionBonus: number
  vibeCardBonus: number
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
  interest:   0.28,
  support:    0.18,
  eventPref:  0.12,
  behavior:   0.20,
  location:   0.12,
}
const MAX_INTENTION_BONUS   = 0.10
const MAX_VIBE_CARD_BONUS   = 0.08

// ---------------------------------------------------------------------------
// Interest + vibe card + scenario → tag vocabulary mapping
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

function buildUserTagSet(interests: string[], vibeCardIds: string[], scenarioAnswers: Record<string, string>): Set<string> {
  const tags = new Set<string>()
  // From explicit interests
  for (const interest of interests) {
    for (const t of INTEREST_TAG_MAP[interest] ?? []) tags.add(t.toLowerCase())
  }
  // From vibe card selections
  for (const t of vibeCardTagsFromIds(vibeCardIds)) tags.add(t.toLowerCase())
  // From scenario answers
  for (const t of scenarioTagsFromAnswers(scenarioAnswers)) tags.add(t.toLowerCase())
  return tags
}

function computeInterestScore(event: MHEvent, userTags: Set<string>): number {
  if (userTags.size === 0) return 0.5

  const eventTags = new Set(event.tags.map(t => t.toLowerCase()))
  if (eventTags.size === 0) return 0.5

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
  if (event.spotsLeft === 0) return 0.1

  const spotsRatio = event.spotsLeft / event.capacity
  let score = 0.3 + spotsRatio * 0.4

  const daysAway = (new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (daysAway <= 1) score += 0.2
  else if (daysAway <= 3) score += 0.1

  const fillRate = (event.capacity - event.spotsLeft) / event.capacity
  if (fillRate > 0.6 && event.spotsLeft > 0) score += 0.1

  return Math.min(1, score)
}

function computeBehaviorScore(
  event: MHEvent,
  behavior: EventBehavior,
  categoryHistory: Record<string, InteractionType[]>,
  postMoodTags: string[],
  reflections: Record<string, ReflectionData>,
): number {
  let score = 0.5

  // Direct event interaction
  const direct = behavior[event.id]
  if (direct === 'dismissed') return 0.0
  if (direct === 'registered') score += 0.25
  if (direct === 'saved') score += 0.15
  if (direct === 'viewed') score += 0.08

  // Category affinity from history
  const catHistory = categoryHistory[event.category] ?? []
  if (catHistory.includes('registered')) score = Math.min(1, score + 0.20)
  if (catHistory.includes('saved')) score = Math.min(1, score + 0.10)
  if (catHistory.includes('dismissed') && !direct) score = Math.max(0, score - 0.25)

  // Reflection signal: if user has reflected on same-category events
  const categoryReflections = Object.values(reflections).filter(r => r.eventCategory === event.category)
  for (const r of categoryReflections) {
    if (r.goAgain === true && r.comfortable === true) score = Math.min(1, score + 0.15)
    if (r.helpful === false || r.relevant === false) score = Math.max(0, score - 0.15)
  }

  // Mood signal from recent posts
  if (postMoodTags.length > 0) {
    const allText = postMoodTags.join(' ').toLowerCase()
    const isNegative = NEGATIVE_MOOD_WORDS.some(w => allText.includes(w))
    const isPositive = POSITIVE_MOOD_WORDS.some(w => allText.includes(w))
    if (isNegative && NEGATIVE_MOOD_BOOSTS.includes(event.category)) score = Math.min(1, score + 0.20)
    if (isPositive && POSITIVE_MOOD_BOOSTS.includes(event.category)) score = Math.min(1, score + 0.15)
  }

  return Math.max(0, Math.min(1, score))
}

function computeLocationScore(
  event: MHEvent, userLat: number | null, userLng: number | null, radiusMi: number
): { score: number; distanceKm: number | null } {
  if (userLat == null || userLng == null) return { score: 0.5, distanceKm: null }

  const distanceKm = haversineKm(userLat, userLng, event.lat, event.lng)
  const radiusKm = radiusMi * 1.60934

  if (distanceKm <= radiusKm) {
    return { score: 1.0 - (distanceKm / radiusKm) * 0.5, distanceKm }
  } else if (distanceKm <= radiusKm * 2) {
    return { score: Math.max(0, 0.5 * (1 - (distanceKm - radiusKm) / radiusKm)), distanceKm }
  }
  return { score: 0, distanceKm }
}

/** Session intention bonus: +MAX_INTENTION_BONUS if event category matches intention */
function computeIntentionBonus(event: MHEvent, intentionId: string | null): number {
  if (!intentionId) return 0
  const intention = INTENTION_OPTIONS.find(o => o.id === intentionId)
  if (!intention) return 0
  return intention.categoryBoosts.includes(event.category) ? MAX_INTENTION_BONUS : 0
}

/** Vibe card category bonus: proportional to how many selected cards directly boost this category */
function computeVibeCardBonus(event: MHEvent, vibeCardIds: string[]): number {
  if (vibeCardIds.length === 0) return 0
  const boostedCategories = vibeCardCategoryBoosts(vibeCardIds)
  if (boostedCategories.includes(event.category)) {
    // Scale by how many cards boost this category
    const count = VIBE_CARDS.filter(c =>
      vibeCardIds.includes(c.id) && c.categoryBoosts?.includes(event.category)
    ).length
    return Math.min(MAX_VIBE_CARD_BONUS, count * (MAX_VIBE_CARD_BONUS / 2))
  }
  return 0
}

// ---------------------------------------------------------------------------
// Explanation generator
// ---------------------------------------------------------------------------

function buildExplanation(breakdown: ScoreBreakdown, event: MHEvent, distanceKm: number | null, intentionId: string | null): string {
  const reasons: string[] = []

  if (breakdown.intentionBonus > 0) {
    const intention = INTENTION_OPTIONS.find(o => o.id === intentionId)
    if (intention) reasons.push(`fits your intention to ${intention.label.toLowerCase()}`)
  }
  if (breakdown.vibeCardBonus > 0) reasons.push(`matches what you said resonates with you`)
  if (breakdown.interest >= 0.25) reasons.push(`matches your interests`)
  if (breakdown.support >= 0.75) reasons.push(`fits your ${event.groupSize} group preference`)
  if (breakdown.location >= 0.8 && distanceKm != null) reasons.push(`only ${distanceKm.toFixed(1)} km away`)
  if (breakdown.behavior >= 0.75) reasons.push(`aligns with your activity`)
  if (breakdown.eventPref >= 0.7 && event.spotsLeft > 0) reasons.push(`${event.spotsLeft} spots open`)

  if (reasons.length === 0) return 'Recommended for you'
  const first = reasons[0][0].toUpperCase() + reasons[0].slice(1)
  return first + (reasons.length > 1 ? ` · ${reasons.slice(1).join(' · ')}` : '')
}

// ---------------------------------------------------------------------------
// Main export: scoreEvents
// ---------------------------------------------------------------------------

export function scoreEvents(events: MHEvent[], ctx: UserContext): ScoredEvent[] {
  // Pre-compute user tag set (interests + vibe cards + scenario answers merged)
  const userTags = buildUserTagSet(ctx.interests, ctx.vibeCardIds, ctx.scenarioAnswers)

  // Pre-compute category history from behavior + event list
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
      const interest      = computeInterestScore(event, userTags)
      const support       = computeSupportScore(event, ctx.supportPrefs)
      const eventPref     = computeEventPrefScore(event)
      const behavior      = computeBehaviorScore(event, ctx.behavior, categoryHistory, ctx.postMoodTags, ctx.reflections)
      const { score: location, distanceKm } = computeLocationScore(event, ctx.lat, ctx.lng, ctx.radiusMi)
      const intentionBonus  = computeIntentionBonus(event, ctx.sessionIntention)
      const vibeCardBonus   = computeVibeCardBonus(event, ctx.vibeCardIds)

      const base =
        WEIGHTS.interest  * interest +
        WEIGHTS.support   * support +
        WEIGHTS.eventPref * eventPref +
        WEIGHTS.behavior  * behavior +
        WEIGHTS.location  * location

      const total = Math.min(1, base + intentionBonus + vibeCardBonus)

      const breakdown: ScoreBreakdown = {
        interest, support, eventPref, behavior, location,
        intentionBonus, vibeCardBonus, total,
      }

      return {
        event,
        score: Math.round(total * 100) / 100,
        breakdown,
        explanation: buildExplanation(breakdown, event, distanceKm, ctx.sessionIntention),
        distanceKm,
      }
    })
    .filter(s => s.breakdown.behavior > 0)  // remove dismissed
    .sort((a, b) => b.score - a.score)
}
