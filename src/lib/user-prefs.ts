/**
 * User preference types and localStorage helpers for Mha Phu La?.
 *
 * Privacy design:
 * - All preference data lives in localStorage (client-only, never sent to server)
 * - Sensitive opt-in categories are never inferred, only explicitly opted-in
 * - No diagnosis labels are stored or exposed
 * - sessionIntention is sessionStorage only (cleared on browser close)
 */

import type { EventCategory } from './events'

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

export const KEYS = {
  interests:       'mhafu_interests',        // string[]
  radius:          'mhafu_radius',           // number (miles)
  supportPrefs:    'mhafu_support_prefs',    // SupportPrefs
  vibeCards:       'mhafu_vibe_cards',       // string[] of card IDs
  scenarioPrefs:   'mhafu_scenario_prefs',   // Record<scenarioId, answerId>
  sessionIntention:'mhafu_session_intention',// string (sessionStorage)
  reflections:     'mhafu_event_reflections',// Record<eventId, ReflectionData>
  eventBehavior:   'mhafu_event_interactions',// EventBehavior
  sensitivePrefs:  'mhafu_sensitive_prefs',  // string[] of opted-in sensitive categories
} as const

// ---------------------------------------------------------------------------
// Vibe cards
// Represent qualitative social/environmental preferences
// ---------------------------------------------------------------------------

export interface VibeCard {
  id: string
  label: string
  emoji: string
  /** Tags injected into the interest scoring pipeline */
  tags: string[]
  /** Directly boosts these event categories */
  categoryBoosts?: EventCategory[]
}

export const VIBE_CARDS: VibeCard[] = [
  {
    id: 'quiet_meetups',
    label: 'I enjoy quiet meetups',
    emoji: '🤫',
    tags: ['quiet', 'calm', 'small group', 'low pressure'],
    categoryBoosts: ['Meditation', 'Mindfulness', 'Journaling Workshop'],
  },
  {
    id: 'emotional_support',
    label: 'I want emotional support spaces',
    emoji: '💙',
    tags: ['peer support', 'counseling', 'group sharing', 'healing'],
    categoryBoosts: ['Support Group', 'Counseling', 'Grief Support'],
  },
  {
    id: 'hobby_hangouts',
    label: 'I like hobby-based hangouts',
    emoji: '🎨',
    tags: ['art', 'creativity', 'activity', 'social', 'casual'],
    categoryBoosts: ['Art Therapy', 'Coffee Chat', 'Walking Group'],
  },
  {
    id: 'shared_experience',
    label: 'I prefer events with people who understand my experience',
    emoji: '🤝',
    tags: ['peer support', 'community', 'empathy', 'shared experience'],
    categoryBoosts: ['Support Group', 'Social Anxiety Meetup', 'Recovery Circle'],
  },
  {
    id: 'structured_learning',
    label: 'I like structured, skill-building sessions',
    emoji: '📚',
    tags: ['workshop', 'learning', 'CBT', 'tools', 'skill building'],
    categoryBoosts: ['Anxiety Workshop', 'Journaling Workshop', 'Counseling'],
  },
  {
    id: 'outdoor_movement',
    label: 'I feel better when I move and get outside',
    emoji: '🌿',
    tags: ['outdoors', 'walking', 'nature', 'exercise', 'physical health'],
    categoryBoosts: ['Walking Group', 'Yoga & Wellness'],
  },
  {
    id: 'virtual_safe',
    label: 'I prefer virtual spaces from the comfort of home',
    emoji: '🏠',
    tags: ['virtual', 'online', 'home', 'safe', 'low pressure'],
  },
  {
    id: 'creative_healing',
    label: 'I find healing through creative expression',
    emoji: '🎭',
    tags: ['art', 'creativity', 'expression', 'journaling', 'healing', 'writing'],
    categoryBoosts: ['Art Therapy', 'Journaling Workshop'],
  },
]

// ---------------------------------------------------------------------------
// Scenario questions
// Short engaging questions that map to structured preference tags
// ---------------------------------------------------------------------------

export interface ScenarioOption {
  id: string
  label: string
  tags: string[]
}

export interface ScenarioQuestion {
  id: string
  question: string
  options: ScenarioOption[]
}

export const SCENARIO_QUESTIONS: ScenarioQuestion[] = [
  {
    id: 'free_time',
    question: 'How do you want to spend your next free time?',
    options: [
      {
        id: 'relax_quietly',
        label: 'Relaxing quietly somewhere peaceful',
        tags: ['quiet', 'calm', 'mindfulness', 'meditation', 'relaxation'],
      },
      {
        id: 'get_outside',
        label: 'Getting outside and moving around',
        tags: ['outdoors', 'walking', 'nature', 'exercise', 'physical health'],
      },
      {
        id: 'meet_people',
        label: 'Connecting with people who get me',
        tags: ['social', 'peer support', 'community', 'connection', 'friendship'],
      },
      {
        id: 'learn_tools',
        label: 'Learning tools that help me feel better',
        tags: ['workshop', 'learning', 'skill building', 'CBT', 'tools'],
      },
    ],
  },
  {
    id: 'social_env',
    question: 'What kind of social environment feels best for you?',
    options: [
      {
        id: 'small_intimate',
        label: 'Small, intimate and low-pressure',
        tags: ['small group', 'quiet', 'low pressure', 'casual'],
      },
      {
        id: 'structured_guided',
        label: 'Structured group with a clear purpose',
        tags: ['structured', 'professional led', 'workshop', 'group'],
      },
      {
        id: 'open_casual',
        label: 'Open and casual — I\'ll go with the flow',
        tags: ['casual', 'social', 'connection', 'community'],
      },
      {
        id: 'one_on_one',
        label: 'One-on-one or a very small circle',
        tags: ['small group', 'counseling', 'quiet', 'low pressure'],
      },
    ],
  },
  {
    id: 'need_now',
    question: 'What kind of event would help you most right now?',
    options: [
      {
        id: 'be_heard',
        label: 'Somewhere I can open up and be heard',
        tags: ['peer support', 'counseling', 'group sharing', 'healing', 'therapy'],
      },
      {
        id: 'fun_distraction',
        label: 'Something fun to get my mind off things',
        tags: ['social', 'art', 'creativity', 'casual', 'fun'],
      },
      {
        id: 'calm_recharge',
        label: 'Something calm to help me recharge',
        tags: ['meditation', 'mindfulness', 'yoga', 'relaxation', 'calm', 'breathing'],
      },
      {
        id: 'practical_skills',
        label: 'Practical skills or techniques I can actually use',
        tags: ['workshop', 'CBT', 'skill building', 'anxiety', 'tools', 'awareness'],
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Session intention (temporary per-session signal)
// Stored in sessionStorage — cleared when browser tab closes
// ---------------------------------------------------------------------------

export interface IntentionOption {
  id: string
  label: string
  emoji: string
  /** Event categories this intention boosts */
  categoryBoosts: EventCategory[]
}

export const INTENTION_OPTIONS: IntentionOption[] = [
  {
    id: 'relax',
    label: 'Relax',
    emoji: '😌',
    categoryBoosts: ['Meditation', 'Mindfulness', 'Yoga & Wellness'],
  },
  {
    id: 'talk',
    label: 'Talk it out',
    emoji: '💬',
    categoryBoosts: ['Support Group', 'Coffee Chat', 'Counseling'],
  },
  {
    id: 'meet_similar',
    label: 'Meet similar people',
    emoji: '🤝',
    categoryBoosts: ['Social Anxiety Meetup', 'Coffee Chat', 'Support Group'],
  },
  {
    id: 'learn',
    label: 'Learn something',
    emoji: '📖',
    categoryBoosts: ['Anxiety Workshop', 'Journaling Workshop', 'Counseling'],
  },
  {
    id: 'recover',
    label: 'Recover & heal',
    emoji: '🌱',
    categoryBoosts: ['Recovery Circle', 'Support Group', 'Mindfulness', 'Grief Support'],
  },
  {
    id: 'get_out',
    label: 'Just get out',
    emoji: '🚪',
    categoryBoosts: ['Walking Group', 'Coffee Chat', 'Art Therapy', 'Yoga & Wellness'],
  },
]

// ---------------------------------------------------------------------------
// Post-event reflection
// ---------------------------------------------------------------------------

export interface ReflectionData {
  eventId: string
  eventCategory: string
  helpful: boolean | null
  goAgain: boolean | null
  comfortable: boolean | null
  relevant: boolean | null
  timestamp: string
}

// ---------------------------------------------------------------------------
// Sensitive support categories (private opt-in)
// Only events tagged with a sensitiveCategory are filtered by this.
// Users see these events ONLY if they have opted in.
// ---------------------------------------------------------------------------

export interface SensitiveCategory {
  id: string
  label: string
  description: string // shown in UI — general, never diagnostic
}

export const SENSITIVE_CATEGORIES: SensitiveCategory[] = [
  {
    id: 'recovery',
    label: 'Recovery & sobriety support',
    description: 'Events focused on recovery journeys and sobriety',
  },
  {
    id: 'grief',
    label: 'Grief & loss support',
    description: 'Events for processing bereavement and significant loss',
  },
  {
    id: 'crisis',
    label: 'Crisis & acute support',
    description: 'Events providing acute mental health crisis support',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function readLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch { return fallback }
}

export function writeLS(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

export function readSession(key: string): string | null {
  if (typeof window === 'undefined') return null
  try { return sessionStorage.getItem(key) } catch { return null }
}

export function writeSession(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try { sessionStorage.setItem(key, value) } catch {}
}

/** Derive merged tag set from selected vibe card IDs */
export function vibeCardTagsFromIds(selectedIds: string[]): string[] {
  const tags = new Set<string>()
  for (const id of selectedIds) {
    const card = VIBE_CARDS.find(c => c.id === id)
    if (card) card.tags.forEach(t => tags.add(t))
  }
  return [...tags]
}

/** Derive merged tag set from scenario answers { scenarioId: answerId } */
export function scenarioTagsFromAnswers(answers: Record<string, string>): string[] {
  const tags = new Set<string>()
  for (const [scenarioId, answerId] of Object.entries(answers)) {
    const q = SCENARIO_QUESTIONS.find(q => q.id === scenarioId)
    const opt = q?.options.find(o => o.id === answerId)
    if (opt) opt.tags.forEach(t => tags.add(t))
  }
  return [...tags]
}

/** Derive direct category boosts from selected vibe card IDs */
export function vibeCardCategoryBoosts(selectedIds: string[]): EventCategory[] {
  const cats = new Set<EventCategory>()
  for (const id of selectedIds) {
    const card = VIBE_CARDS.find(c => c.id === id)
    if (card?.categoryBoosts) card.categoryBoosts.forEach(c => cats.add(c))
  }
  return [...cats]
}
