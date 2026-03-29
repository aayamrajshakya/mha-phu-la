'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Heart, MapPin, Camera, ChevronRight, Loader2, Check, SlidersHorizontal } from 'lucide-react'
import {
  KEYS, writeLS,
  AGE_RANGES,
  IMAGE_QUESTIONS,
  SUPPORT_SPACES,
  imageAnswerTagsFromAnswers,
} from '@/lib/user-prefs'
import { type SupportPrefs, DEFAULT_SUPPORT_PREFS } from '@/lib/recommend'
import { ImageChoice } from '@/components/onboarding/ImageChoice'

const STEPS = ['name', 'age', 'gender', 'bio', 'image_questions', 'support_spaces', 'location', 'photo'] as const
type Step = typeof STEPS[number]

const GENDERS = [
  { label: 'Male',   symbol: '♂', symbolClass: 'text-blue-500' },
  { label: 'Female', symbol: '♀', symbolClass: 'text-pink-500' },
  { label: 'Other',  symbol: '⚧', symbolClass: 'bg-gradient-to-r from-blue-500 to-pink-500 bg-clip-text text-transparent' },
]

// Support spaces style selector images (shown at top of Layer 2 step)
const SPACE_STYLE_OPTIONS = [
  {
    id: 'structured',
    label: 'Structured & led',
    imageUrl: 'https://zhlvedruguvoayvhqpjg.supabase.co/storage/v1/object/public/tool-images/tools/3ef51cd0-7c33-4b3e-a685-ebd9b0a92362/da4dff49-2a9c-40bd-b14d-c7c8f8158f70.jpeg',
  },
  {
    id: 'cozy',
    label: 'Cozy & informal',
    imageUrl: 'https://images.stockcake.com/public/1/0/8/1082ab62-3831-4cb1-a48b-adb330bff422_large/cozy-evening-together-stockcake.jpg',
  },
] as const

export default function OnboardingInner() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('name')
  const [form, setForm] = useState({
    name: '', gender: '', bio: '',
    address: '', lat: null as number | null, lng: null as number | null,
    avatar_url: '',
  })

  // Age
  const [age, setAge] = useState('')
  const [imageAnswers, setImageAnswers]         = useState<Record<string, string>>({})
  const [currentImageQ, setCurrentImageQ]       = useState(0)

  // Layer 2: support spaces
  const [spaceStyle, setSpaceStyle]       = useState<string | null>(null)
  const [selectedSpaces, setSelectedSpaces] = useState<Set<string>>(new Set())

  // Location + radius
  const [radius, setRadius]                 = useState(5)

  // UI state
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [uploading, setUploading] = useState(false)

  const stepIndex = STEPS.indexOf(step)
  const progress  = ((stepIndex + 1) / STEPS.length) * 100

  function next() {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
    else handleSubmit()
  }

  function canProceed() {
    if (step === 'name')            return form.name.trim().length >= 2
    if (step === 'age')             return Number(age) >= 18
    if (step === 'gender')          return form.gender !== ''
    if (step === 'bio')             return form.bio.trim().length >= 10
    if (step === 'image_questions') return currentImageQ >= IMAGE_QUESTIONS.length
    return true  // location, support_spaces, photo are all skippable/optional
  }

  // Image questions: select + auto-advance after a brief visual delay
  function handleImageAnswer(qId: string, optId: string) {
    setImageAnswers(prev => ({ ...prev, [qId]: optId }))
    setTimeout(() => {
      setCurrentImageQ(prev =>
        prev < IMAGE_QUESTIONS.length - 1 ? prev + 1 : IMAGE_QUESTIONS.length
      )
    }, 350)
  }

  function toggleSpace(id: string) {
    setSelectedSpaces(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function detectLocation() {
    if (!navigator.geolocation) { next(); return }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setForm(f => ({ ...f, lat: latitude, lng: longitude }))
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          )
          const data = await res.json()
          const city    = data.address?.city || data.address?.town || data.address?.village || ''
          const country = data.address?.country || ''
          setForm(f => ({ ...f, address: [city, country].filter(Boolean).join(', ') }))
        } catch {}
        setLoading(false)
      },
      () => { setLoading(false) }
    )
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const ext  = file.name.split('.').pop()
    const path = `avatars/${user.id}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setForm(f => ({ ...f, avatar_url: data.publicUrl }))
    }
    setUploading(false)
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    // ── Supabase profile ──────────────────────────────────────────────────────
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id:         user.id,
      email:      user.email,
      name:       form.name,
      age:        Number(age),
      gender:     form.gender,
      bio:        form.bio,
      address:    form.address,
      lat:        form.lat,
      lng:        form.lng,
      avatar_url: form.avatar_url,
      preferred_radius: radius,
    })
    if (profileErr) { setError(profileErr.message); setLoading(false); return }

    // ── Derive SupportPrefs from image answers ────────────────────────────────
    const supportPrefs: SupportPrefs = { ...DEFAULT_SUPPORT_PREFS }
    const vibeAnswer      = imageAnswers['vibe_pref']
    const groupSizeAnswer = imageAnswers['group_size']
    if (vibeAnswer === 'energetic') supportPrefs.vibe = 'active'
    else if (vibeAnswer === 'quiet') supportPrefs.vibe = 'quiet'
    if (groupSizeAnswer === 'small') supportPrefs.groupSize = 'small'
    else if (groupSizeAnswer === 'large') supportPrefs.groupSize = 'large'
    writeLS(KEYS.supportPrefs, supportPrefs)

    // ── Radius ────────────────────────────────────────────────────────────────
    writeLS(KEYS.radius, radius)

    // ── Image answer tags ─────────────────────────────────────────────────────
    const allTags = imageAnswerTagsFromAnswers(imageAnswers)
    // Also append spaceStyle tags
    if (spaceStyle === 'structured') allTags.push('structured', 'professional led', 'workshop')
    if (spaceStyle === 'cozy')       allTags.push('casual', 'relaxed', 'community', 'coffee')
    writeLS(KEYS.imageAnswerTags, [...new Set(allTags)])

    // ── Support spaces ────────────────────────────────────────────────────────
    const spaceIds = [...selectedSpaces]
    writeLS(KEYS.supportSpaces, spaceIds)

    // Sensitive categories implied by selected spaces
    const sensitiveCategories = new Set<string>()
    for (const id of spaceIds) {
      const space = SUPPORT_SPACES.find(s => s.id === id)
      if (space?.sensitiveCategory) sensitiveCategories.add(space.sensitiveCategory)
    }
    if (sensitiveCategories.size > 0) {
      writeLS(KEYS.sensitivePrefs, [...sensitiveCategories])
    }

    writeLS(KEYS.ageRange, age)

    router.push('/feed')
    router.refresh()
  }

  const currentQ              = IMAGE_QUESTIONS[currentImageQ]
  const allQuestionsAnswered  = currentImageQ >= IMAGE_QUESTIONS.length

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-yellow-50 to-amber-50">
      <div className="h-1 bg-gray-200">
        <div className="h-1 bg-yellow-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          {/* Brand */}
          <div className="flex items-center gap-2 mb-8">
            <div className="bg-yellow-400 text-gray-900 rounded-xl p-2">
              <Heart className="w-5 h-5" />
            </div>
            <span className="font-bold text-yellow-500 text-lg">Mha Phu La?</span>
          </div>

          {/* ── name ── */}
          {step === 'name' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">What&apos;s your name?</h2>
              <p className="text-gray-500 mb-6 text-sm">This is how others will see you</p>
              <Input
                placeholder="Your name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="h-12 rounded-xl text-base"
                autoFocus
              />
            </div>
          )}

          {/* ── age ── */}
          {step === 'age' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">How old are you?</h2>
              <p className="text-gray-500 mb-6 text-sm">You must be 18 or older to use Mha Phu La?</p>
              <input
                type="number"
                min={18}
                max={120}
                placeholder="Enter your age"
                value={age}
                onChange={e => setAge(e.target.value)}
                autoFocus
                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3.5 text-base font-medium focus:outline-none focus:border-yellow-400 transition-colors"
              />
              {age !== '' && Number(age) < 18 && (
                <p className="text-red-500 text-sm mt-2">You must be at least 18 years old.</p>
              )}
            </div>
          )}

          {/* ── gender ── */}
          {step === 'gender' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">What&apos;s your gender?</h2>
              <p className="text-gray-500 mb-6 text-sm">Select the option that best describes you</p>
              <div className="flex flex-col gap-3">
                {GENDERS.map(g => (
                  <button
                    key={g.label}
                    onClick={() => setForm(f => ({ ...f, gender: g.label }))}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                      form.gender === g.label
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-gray-100 bg-white hover:border-yellow-200'
                    }`}
                  >
                    <span className={`text-3xl w-10 text-center ${g.symbolClass}`}>{g.symbol}</span>
                    <span className="font-medium text-gray-800">{g.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── bio ── */}
          {step === 'bio' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Tell us about yourself</h2>
              <p className="text-gray-500 mb-6 text-sm">Share a bit about your journey (min 10 characters)</p>
              <Textarea
                placeholder="What&apos;s been on your mind lately? What brings you here?"
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                className="rounded-xl text-base resize-none"
                rows={4}
                autoFocus
              />
            </div>
          )}

          {/* ── image questions (Layer 1) ── */}
          {step === 'image_questions' && (
            <div>
              {!allQuestionsAnswered && currentQ ? (
                <>
                  {/* Progress dots */}
                  <div className="flex gap-1.5 mb-5">
                    {IMAGE_QUESTIONS.map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1 rounded-full transition-all ${
                          i < currentImageQ ? 'bg-yellow-400' : i === currentImageQ ? 'bg-yellow-300' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{currentQ.question}</h2>
                  {currentQ.subtitle && (
                    <p className="text-sm text-gray-400 mb-4">{currentQ.subtitle}</p>
                  )}
                  <ImageChoice
                    options={currentQ.options as [typeof currentQ.options[0], typeof currentQ.options[1]]}
                    selected={imageAnswers[currentQ.id] ?? null}
                    onChange={(optId) => handleImageAnswer(currentQ.id, optId)}
                  />
                  <p className="text-[10px] text-gray-400 mt-4 text-center">
                    Private · only used to personalise your event feed
                  </p>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">✨</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Great taste!</h2>
                  <p className="text-sm text-gray-500">
                    We&apos;ll use your answers to personalise your event recommendations.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── support spaces (Layer 2 — opt-in) ── */}
          {step === 'support_spaces' && (
            <div>
              <div className="flex items-start gap-3 mb-1">
                <h2 className="text-xl font-bold text-gray-900 leading-snug">
                  Which support spaces interest you?
                </h2>
              </div>
              <p className="text-[11px] text-gray-400 mb-4">
                Optional · private · you can change this any time in Settings
              </p>

              {/* Style image chooser */}
              <p className="text-xs font-medium text-gray-500 mb-2">What kind of space feels right?</p>
              <ImageChoice
                options={SPACE_STYLE_OPTIONS as [typeof SPACE_STYLE_OPTIONS[0], typeof SPACE_STYLE_OPTIONS[1]]}
                selected={spaceStyle}
                onChange={setSpaceStyle}
              />

              {/* Specific support space chips */}
              <p className="text-xs font-medium text-gray-500 mt-5 mb-2">Any specific areas?</p>
              <div className="flex flex-wrap gap-2">
                {SUPPORT_SPACES.map(space => {
                  const active = selectedSpaces.has(space.id)
                  return (
                    <button
                      key={space.id}
                      onClick={() => toggleSpace(space.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        active
                          ? 'bg-yellow-400 border-yellow-400 text-gray-900'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-yellow-300'
                      }`}
                    >
                      <span>{space.emoji}</span>
                      {space.label}
                      {active && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  )
                })}
              </div>
              {selectedSpaces.size > 0 && (
                <p className="text-[10px] text-gray-400 mt-3">
                  {selectedSpaces.size} area{selectedSpaces.size > 1 ? 's' : ''} selected · used only to surface relevant events
                </p>
              )}
            </div>
          )}

          {/* ── location ── */}
          {step === 'location' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Where are you?</h2>
              <p className="text-gray-500 mb-6 text-sm">Used to show you events and people nearby</p>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={detectLocation}
                  disabled={loading}
                  className="h-12 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-gray-900 gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                  Detect my location
                </Button>
                <Input
                  placeholder="Or type your city"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="h-12 rounded-xl"
                />
                {form.address && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-xl">
                    <Check className="w-3.5 h-3.5" />
                    {form.address}
                  </div>
                )}

                {/* Radius selector */}
                <div className="mt-2 bg-white border border-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 mb-3">
                    <SlidersHorizontal className="w-4 h-4 text-yellow-500" />
                    <p className="text-sm font-medium text-gray-700">How far would you travel?</p>
                    <span className="ml-auto text-sm font-bold text-yellow-500">{radius} mi</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={50}
                    step={1}
                    value={radius}
                    onChange={e => setRadius(Number(e.target.value))}
                    className="w-full accent-yellow-400"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>1 mi</span>
                    <span>50 mi</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── photo ── */}
          {step === 'photo' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Add a profile photo</h2>
              <p className="text-gray-500 mb-6 text-sm">Optional — you can add one later</p>
              <div className="flex flex-col items-center gap-4">
                <label className="cursor-pointer">
                  <div className="w-28 h-28 rounded-full bg-yellow-100 flex items-center justify-center overflow-hidden border-4 border-yellow-200 hover:border-yellow-400 transition-colors">
                    {form.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 text-yellow-400" />
                    )}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
                {uploading && <p className="text-sm text-yellow-500">Uploading…</p>}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

          {/* ── Navigation buttons ── */}
          <div className="mt-8 flex flex-col gap-3">
            {step === 'image_questions' && !allQuestionsAnswered ? (
              // While cycling through questions, no button — auto-advances on selection
              <p className="text-center text-xs text-gray-400">Tap an image above to continue</p>
            ) : step === 'support_spaces' ? (
              <>
                <Button
                  onClick={next}
                  className="w-full h-12 rounded-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold gap-2"
                >
                  {selectedSpaces.size > 0
                    ? `Continue with ${selectedSpaces.size} selected`
                    : 'Continue'}
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button onClick={next} variant="outline" className="w-full h-12 rounded-full text-gray-500">
                  Skip for now
                </Button>
              </>
            ) : step === 'location' ? (
              <>
                <Button
                  onClick={next}
                  disabled={loading}
                  className="w-full h-12 rounded-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold gap-2"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
                <Button onClick={next} variant="outline" className="w-full h-12 rounded-full text-gray-500">
                  Skip for now
                </Button>
              </>
            ) : (
              <Button
                onClick={step === 'photo' ? handleSubmit : next}
                disabled={!canProceed() || loading || uploading}
                className="w-full h-12 rounded-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold gap-2"
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <>{step === 'photo' ? 'Finish setup' : 'Continue'}<ChevronRight className="w-4 h-4" /></>
                }
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Step {stepIndex + 1} of {STEPS.length}
          </p>
        </div>
      </div>
    </div>
  )
}
