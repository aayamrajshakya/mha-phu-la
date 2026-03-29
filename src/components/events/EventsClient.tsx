'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { MHEvent, EventCategory } from '@/lib/events'
import { scoreEvents, UserContext, SupportPrefs, DEFAULT_SUPPORT_PREFS, EventBehavior, ScoredEvent } from '@/lib/recommend'
import { RADIUS_KEY, DEFAULT_RADIUS, SUPPORT_PREFS_KEY } from '@/components/layout/SideDrawer'
import {
  KEYS, readLS, writeLS, readSession,
  vibeCardTagsFromIds, scenarioTagsFromAnswers,
  ReflectionData,
} from '@/lib/user-prefs'
import { buildRecommendationExplanationPrompt, parseLLMJson } from '@/lib/llm-prompts'
import { useWebLLM } from '@/hooks/useWebLLM'
import { recordActivityDay } from '@/lib/points'
import IntentionCheckIn from './IntentionCheckIn'
import ReflectionDialog from './ReflectionDialog'
import { MapPin, Clock, Users, Calendar, Tag, Bookmark, BookmarkCheck, X, Sparkles, ClipboardList, Bot, Loader2 } from 'lucide-react'

const INTERESTS_KEY = 'mhafu_interests'

const CATEGORY_COLORS: Record<EventCategory, string> = {
  'Counseling':            'bg-blue-100 text-blue-700',
  'Support Group':         'bg-purple-100 text-purple-700',
  'Meditation':            'bg-teal-100 text-teal-700',
  'Yoga & Wellness':       'bg-green-100 text-green-700',
  'Art Therapy':           'bg-pink-100 text-pink-700',
  'Walking Group':         'bg-lime-100 text-lime-700',
  'Coffee Chat':           'bg-amber-100 text-amber-700',
  'Journaling Workshop':   'bg-orange-100 text-orange-700',
  'Recovery Circle':       'bg-indigo-100 text-indigo-700',
  'Social Anxiety Meetup': 'bg-rose-100 text-rose-700',
  'Grief Support':         'bg-slate-100 text-slate-700',
  'Mindfulness':           'bg-cyan-100 text-cyan-700',
  'Crisis Support':        'bg-red-100 text-red-700',
  'Anxiety Workshop':      'bg-yellow-100 text-yellow-700',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

interface Props {
  events: MHEvent[]
  userLat: number | null
  userLng: number | null
  postMoodTags: string[]
}

type TabType = 'for-you' | 'all'

// ---------------------------------------------------------------------------
// EventCard
// ---------------------------------------------------------------------------
function EventCard({
  event,
  explanation,
  distanceKm,
  score,
  behavior,
  reflections,
  onInteract,
  onReflect,
  expanded,
  onToggleExpand,
}: {
  event: MHEvent
  explanation?: string
  distanceKm?: number | null
  score?: number
  behavior: EventBehavior
  reflections: Record<string, ReflectionData>
  onInteract: (id: string, type: 'saved' | 'registered' | 'dismissed' | 'viewed') => void
  onReflect: (event: MHEvent) => void
  expanded: boolean
  onToggleExpand: () => void
}) {
  const spotsPct = event.spotsLeft / event.capacity
  const spotsColor = spotsPct === 0 ? 'text-red-500' : spotsPct < 0.25 ? 'text-orange-500' : 'text-green-600'
  const isSaved = behavior[event.id] === 'saved'
  const isRegistered = behavior[event.id] === 'registered'
  const hasReflection = !!reflections[event.id]

  if (behavior[event.id] === 'dismissed') return null

  return (
    <div className="px-4 py-4 bg-white hover:bg-gray-50/50 transition-colors">
      {explanation && (
        <div className="flex items-center gap-1 mb-2">
          <Sparkles className="w-3 h-3 text-yellow-400" />
          <span className="text-[10px] text-yellow-600 font-medium">{explanation}</span>
          {score != null && (
            <span className="ml-auto text-[10px] text-gray-300">{Math.round(score * 100)}% match</span>
          )}
        </div>
      )}

      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1.5 ${CATEGORY_COLORS[event.category] ?? 'bg-gray-100 text-gray-500'}`}>
            {event.category}
          </span>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{event.title}</h3>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-bold text-yellow-500">{formatDate(event.date)}</p>
          <p className="text-[10px] text-gray-400">{event.time}</p>
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        <span className="flex items-center gap-1 text-[11px] text-gray-400">
          <MapPin className="w-3 h-3" />
          {event.location}
          {distanceKm != null && <span className="text-gray-300 ml-0.5">· {distanceKm.toFixed(1)} km</span>}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-gray-400">
          <Clock className="w-3 h-3" /> {event.durationMin} min
        </span>
        <span className={`flex items-center gap-1 text-[11px] font-medium ${spotsColor}`}>
          <Users className="w-3 h-3" />
          {event.spotsLeft === 0 ? 'Full' : `${event.spotsLeft} spots left`}
        </span>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 mt-2">
        <button onClick={onToggleExpand} className="text-[11px] text-yellow-500 hover:underline">
          {expanded ? 'Show less' : 'Show more'}
        </button>
        <span className="text-gray-200">·</span>
        <button
          onClick={() => onInteract(event.id, isSaved ? 'viewed' : 'saved')}
          className={`flex items-center gap-1 text-[11px] transition-colors ${isSaved ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
        >
          {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          {isSaved ? 'Saved' : 'Save'}
        </button>
        {isRegistered && !hasReflection && (
          <>
            <span className="text-gray-200">·</span>
            <button
              onClick={() => onReflect(event)}
              className="flex items-center gap-1 text-[11px] text-purple-500 hover:text-purple-600"
            >
              <ClipboardList className="w-3.5 h-3.5" /> Reflect
            </button>
          </>
        )}
        {hasReflection && (
          <span className="text-[10px] text-gray-400 ml-1">✓ Reflected</span>
        )}
        <button
          onClick={() => onInteract(event.id, 'dismissed')}
          className="ml-auto text-gray-300 hover:text-gray-500 transition-colors"
          title="Not for me"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-gray-600 leading-relaxed">{event.description}</p>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Hosted by {event.host}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {[
              ...event.tags,
              event.groupSize === 'small' ? 'small group' : 'large group',
              event.vibe, event.format, event.dayType,
            ].map(tag => (
              <span key={tag} className="flex items-center gap-0.5 text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                <Tag className="w-2.5 h-2.5" /> {tag}
              </span>
            ))}
          </div>

          <div className="mt-2">
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-yellow-400 transition-all"
                style={{ width: `${((event.capacity - event.spotsLeft) / event.capacity) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">{event.capacity - event.spotsLeft}/{event.capacity} registered</p>
          </div>

          <button
            disabled={event.spotsLeft === 0}
            onClick={() => !isRegistered && onInteract(event.id, 'registered')}
            className={`mt-2 w-full py-2 rounded-full text-sm font-semibold transition-colors ${
              isRegistered
                ? 'bg-green-100 text-green-700 cursor-default'
                : 'bg-yellow-400 hover:bg-yellow-500 text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {event.spotsLeft === 0 ? 'Event Full' : isRegistered ? 'Registered' : 'Register Interest'}
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function EventsClient({ events, userLat, userLng, postMoodTags }: Props) {
  const [tab, setTab] = useState<TabType>('for-you')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [behavior, setBehavior] = useState<EventBehavior>({})
  const [reflections, setReflections] = useState<Record<string, ReflectionData>>({})
  const [reflectingOn, setReflectingOn] = useState<MHEvent | null>(null)

  // LLM enhancement state
  const llm = useWebLLM()
  const [llmExplanations, setLlmExplanations] = useState<Record<string, string>>({})
  const [enhancing, setEnhancing] = useState(false)
  const [showReadyToast, setShowReadyToast] = useState(false)

  useEffect(() => {
    if (llm.status === 'ready') {
      setShowReadyToast(true)
      const t = setTimeout(() => setShowReadyToast(false), 3000)
      return () => clearTimeout(t)
    }
  }, [llm.status])

  // Preference signals from localStorage
  const [interests, setInterests] = useState<string[]>([])
  const [supportPrefs, setSupportPrefs] = useState<SupportPrefs>(DEFAULT_SUPPORT_PREFS)
  const [radiusMi, setRadiusMi] = useState(DEFAULT_RADIUS)
  const [vibeCardIds, setVibeCardIds] = useState<string[]>([])
  const [scenarioAnswers, setScenarioAnswers] = useState<Record<string, string>>({})
  const [sessionIntention, setSessionIntention] = useState<string | null>(null)
  const [sensitiveOptIns, setSensitiveOptIns] = useState<Set<string>>(new Set())
  // Layer 1 & 2 signals from onboarding
  const [imageAnswerTags, setImageAnswerTags] = useState<string[]>([])
  const [supportSpaces, setSupportSpaces] = useState<string[]>([])

  useEffect(() => {
    try {
      const si = localStorage.getItem(INTERESTS_KEY)
      if (si) setInterests(JSON.parse(si))

      const sr = localStorage.getItem(RADIUS_KEY)
      if (sr) setRadiusMi(Number(sr))

      const sp = localStorage.getItem(SUPPORT_PREFS_KEY)
      if (sp) setSupportPrefs({ ...DEFAULT_SUPPORT_PREFS, ...JSON.parse(sp) })

      setVibeCardIds(readLS<string[]>(KEYS.vibeCards, []))
      setScenarioAnswers(readLS<Record<string, string>>(KEYS.scenarioPrefs, {}))
      setBehavior(readLS<EventBehavior>(KEYS.eventBehavior, {}))
      setReflections(readLS<Record<string, ReflectionData>>(KEYS.reflections, {}))
      setSensitiveOptIns(new Set(readLS<string[]>(KEYS.sensitivePrefs, [])))
      setImageAnswerTags(readLS<string[]>(KEYS.imageAnswerTags, []))
      setSupportSpaces(readLS<string[]>(KEYS.supportSpaces, []))

      // Session intention from sessionStorage (session-only, ephemeral)
      const intention = readSession(KEYS.sessionIntention)
      if (intention) setSessionIntention(intention)
    } catch {}
  }, [])

  function interact(id: string, type: 'saved' | 'registered' | 'dismissed' | 'viewed') {
    setBehavior(prev => {
      const next = { ...prev, [id]: type }
      writeLS(KEYS.eventBehavior, next)
      return next
    })
    if (type === 'registered') {
      fetch('/api/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'event_registered', reference_id: id }),
      })
      recordActivityDay()
    }
  }

  function handleToggleExpand(id: string) {
    setExpanded(prev => {
      const next = prev === id ? null : id
      if (next && !behavior[id]) interact(id, 'viewed')
      return next
    })
  }

  function handleReflectionSaved(reflection: ReflectionData) {
    setReflections(prev => ({ ...prev, [reflection.eventId]: reflection }))
  }

  // Privacy filter: remove sensitive events the user hasn't opted into
  const visibleEvents = useMemo(() =>
    events.filter(e =>
      !e.sensitiveCategory || sensitiveOptIns.has(e.sensitiveCategory)
    ),
    [events, sensitiveOptIns]
  )

  // Build user context for scorer
  const ctx: UserContext = useMemo(() => ({
    interests,
    supportPrefs,
    lat: userLat,
    lng: userLng,
    radiusMi,
    postMoodTags,
    behavior,
    vibeCardIds,
    scenarioAnswers,
    sessionIntention,
    reflections,
    imageAnswerTags,
    supportSpaces,
  }), [interests, supportPrefs, userLat, userLng, radiusMi, postMoodTags, behavior, vibeCardIds, scenarioAnswers, sessionIntention, reflections, imageAnswerTags, supportSpaces])

  const scored: ScoredEvent[] = useMemo(() => scoreEvents(visibleEvents, ctx), [visibleEvents, ctx])

  const enhanceWithAI = useCallback(async () => {
    if (llm.status === 'idle') {
      llm.load()
      return
    }
    if (llm.status !== 'ready' || enhancing) return

    setEnhancing(true)
    const top5 = scored.slice(0, 5)
    const results: Record<string, string> = {}

    for (const s of top5) {
      const prompt = buildRecommendationExplanationPrompt({
        eventTitle: s.event.title,
        eventCategory: s.event.category,
        userInterests: interests,
        matchedTags: s.event.tags,
        distanceKm: s.distanceKm ?? null,
        scoreBreakdown: {
          interest:  s.breakdown.interest,
          support:   s.breakdown.support,
          behavior:  s.breakdown.behavior,
          location:  s.breakdown.location,
        },
      })

      const raw = await llm.run(
        'You are a warm mental-health app assistant. Return only valid JSON.',
        prompt,
        120,
      )
      if (raw) {
        const parsed = parseLLMJson<{ short_reason: string; detail: string | null }>(raw, {
          short_reason: s.explanation ?? '',
          detail: null,
        })
        results[s.event.id] = parsed.detail
          ? `${parsed.short_reason} ${parsed.detail}`
          : parsed.short_reason
      }
    }

    setLlmExplanations(prev => ({ ...prev, ...results }))
    setEnhancing(false)
  }, [llm, scored, interests, enhancing])

  const categories = ['All', ...Array.from(new Set(visibleEvents.map(e => e.category)))]
  const filteredAll = activeCategory === 'All' ? visibleEvents : visibleEvents.filter(e => e.category === activeCategory)

  const dismissedCount = Object.values(behavior).filter(v => v === 'dismissed').length
  const hasPrefs = interests.length > 0 || vibeCardIds.length > 0 || Object.keys(scenarioAnswers).length > 0

  return (
    <div className="flex flex-col">
      {/* Tab switcher */}
      <div className="flex border-b border-gray-100 bg-white">
        <button
          onClick={() => setTab('for-you')}
          className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
            tab === 'for-you' ? 'border-yellow-400 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> For You
        </button>
        <button
          onClick={() => setTab('all')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
            tab === 'all' ? 'border-yellow-400 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          All Events
        </button>
      </div>

      {/* ── For You tab ── */}
      {tab === 'for-you' && (
        <>
          {/* Session intention check-in */}
          <IntentionCheckIn
            current={sessionIntention}
            onSelect={id => setSessionIntention(id || null)}
          />

          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {scored.length} personalised picks
              {!hasPrefs && <span className="ml-1 text-yellow-500">· Set preferences in the menu ☰ for better matches</span>}
            </p>
            {dismissedCount > 0 && (
              <button
                onClick={() => {
                  const next: EventBehavior = {}
                  for (const [k, v] of Object.entries(behavior)) {
                    if (v !== 'dismissed') next[k] = v
                  }
                  setBehavior(next)
                  writeLS(KEYS.eventBehavior, next)
                }}
                className="text-[10px] text-gray-400 hover:text-red-400"
              >
                Clear {dismissedCount} dismissed
              </button>
            )}
          </div>

          {/* AI enhance bar — hidden when WebGPU isn't available */}
          {llm.status !== 'unsupported' && llm.status !== 'error' && scored.length > 0 && (
            <div className="mx-4 mb-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 flex items-center gap-2">
              {llm.status === 'loading' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-500">Loading AI model… {Math.round(llm.progress * 100)}%</p>
                    <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-1 bg-yellow-400 rounded-full transition-all" style={{ width: `${llm.progress * 100}%` }} />
                    </div>
                  </div>
                </>
              ) : enhancing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin flex-shrink-0" />
                  <p className="text-[10px] text-gray-500">AI is writing explanations…</p>
                </>
              ) : (
                <>
                  <Bot className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <p className="text-[10px] text-gray-500 flex-1">
                    {llm.status === 'ready'
                      ? Object.keys(llmExplanations).length > 0
                        ? 'AI explanations active'
                        : 'AI model ready'
                      : 'Enhance top picks with AI explanations'}
                  </p>
                  <button
                    onClick={enhanceWithAI}
                    className="flex-shrink-0 px-2.5 py-1 rounded-full bg-yellow-400 hover:bg-yellow-500 text-[10px] font-semibold text-gray-900 transition-colors"
                  >
                    {llm.status === 'ready' ? 'Enhance' : 'Load AI'}
                  </button>
                </>
              )}
            </div>
          )}

          {scored.length === 0 ? (
            <div className="text-center py-16 px-6 text-gray-400">
              <p className="text-3xl mb-3">✨</p>
              <p className="font-medium text-sm">No recommendations yet</p>
              <p className="text-xs mt-1">Set your interests and preferences in the menu ☰ for personalised picks</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-50 pb-24">
              {scored.map(s => (
                <EventCard
                  key={s.event.id}
                  event={s.event}
                  explanation={llmExplanations[s.event.id] ?? s.explanation}
                  distanceKm={s.distanceKm}
                  score={s.score}
                  behavior={behavior}
                  reflections={reflections}
                  onInteract={interact}
                  onReflect={setReflectingOn}
                  expanded={expanded === s.event.id}
                  onToggleExpand={() => handleToggleExpand(s.event.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── All Events tab ── */}
      {tab === 'all' && (
        <>
          <div className="px-4 py-3 overflow-x-auto flex gap-2 border-b border-gray-100 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activeCategory === cat
                    ? 'bg-yellow-400 border-yellow-400 text-gray-900'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-yellow-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <p className="px-4 pt-3 pb-1 text-xs text-gray-400">{filteredAll.length} events</p>
          <div className="flex flex-col divide-y divide-gray-50 pb-24">
            {filteredAll.map(event => (
              <EventCard
                key={event.id}
                event={event}
                behavior={behavior}
                reflections={reflections}
                onInteract={interact}
                onReflect={setReflectingOn}
                expanded={expanded === event.id}
                onToggleExpand={() => handleToggleExpand(event.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Reflection dialog */}
      {reflectingOn && (
        <ReflectionDialog
          event={reflectingOn}
          onClose={() => setReflectingOn(null)}
          onSaved={handleReflectionSaved}
        />
      )}

      {/* AI ready toast */}
      <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        showReadyToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}>
        <div className="flex items-center gap-2 bg-gray-900 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg">
          <Bot className="w-3.5 h-3.5 text-yellow-400" />
          AI model loaded — tap Enhance to personalise explanations
        </div>
      </div>
    </div>
  )
}
