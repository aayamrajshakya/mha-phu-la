'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { MOODS } from '@/lib/moods'
import { Heart, MapPin, Camera, ChevronRight, Loader2 } from 'lucide-react'

const STEPS = ['name', 'age', 'bio', 'mood', 'location', 'photo'] as const
type Step = typeof STEPS[number]

export default function OnboardingInner() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('name')
  const [form, setForm] = useState({
    name: '',
    age: '',
    bio: '',
    mood: '',
    address: '',
    lat: null as number | null,
    lng: null as number | null,
    avatar_url: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const stepIndex = STEPS.indexOf(step)
  const progress = ((stepIndex + 1) / STEPS.length) * 100

  function next() {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
    else handleSubmit()
  }

  function canProceed() {
    if (step === 'name') return form.name.trim().length >= 2
    if (step === 'age') return Number(form.age) >= 13 && Number(form.age) <= 100
    if (step === 'bio') return form.bio.trim().length >= 10
    if (step === 'mood') return form.mood !== ''
    return true
  }

  async function detectLocation() {
    if (!navigator.geolocation) return
    setLoading(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords
      setForm(f => ({ ...f, lat: latitude, lng: longitude }))
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
        )
        const data = await res.json()
        const city = data.address?.city || data.address?.town || data.address?.village || ''
        const country = data.address?.country || ''
        setForm(f => ({ ...f, address: [city, country].filter(Boolean).join(', ') }))
      } catch {}
      setLoading(false)
      next()
    }, () => { setLoading(false); next() })
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const ext = file.name.split('.').pop()
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

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      name: form.name,
      age: Number(form.age),
      bio: form.bio,
      mood: form.mood,
      address: form.address,
      lat: form.lat,
      lng: form.lng,
      avatar_url: form.avatar_url,
    })

    if (error) { setError(error.message); setLoading(false); return }
    router.push('/feed')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-yellow-50 to-amber-50">
      <div className="h-1 bg-gray-200">
        <div
          className="h-1 bg-yellow-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8">
            <div className="bg-yellow-400 text-gray-900 rounded-xl p-2">
              <Heart className="w-5 h-5" />
            </div>
            <span className="font-bold text-yellow-500 text-lg">Mha Fu La?</span>
          </div>

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

          {step === 'age' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">How old are you?</h2>
              <p className="text-gray-500 mb-6 text-sm">You must be 13 or older to join</p>
              <Input
                type="number"
                placeholder="Your age"
                value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                className="h-12 rounded-xl text-base"
                autoFocus
                min={13}
                max={100}
              />
            </div>
          )}

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

          {step === 'mood' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">How are you feeling today?</h2>
              <p className="text-gray-500 mb-6 text-sm">This shows on your profile and can be updated anytime</p>
              <div className="flex flex-col gap-3">
                {MOODS.map(m => (
                  <button
                    key={m.label}
                    onClick={() => setForm(f => ({ ...f, mood: m.label }))}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                      form.mood === m.label
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-gray-100 bg-white hover:border-yellow-200'
                    }`}
                  >
                    <span className="text-2xl">{m.emoji}</span>
                    <span className="font-medium text-gray-800">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'location' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Where are you?</h2>
              <p className="text-gray-500 mb-6 text-sm">Used to show you people and posts nearby</p>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={detectLocation}
                  disabled={loading}
                  className="h-12 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-gray-900 gap-2"
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
              </div>
            </div>
          )}

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
                {uploading && <p className="text-sm text-yellow-500">Uploading...</p>}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

          <div className="mt-8 flex flex-col gap-3">
            {step === 'location' ? (
              <Button onClick={next} variant="outline" className="w-full h-12 rounded-full">
                Skip for now
              </Button>
            ) : (
              <Button
                onClick={step === 'photo' ? handleSubmit : next}
                disabled={!canProceed() || loading || uploading}
                className="w-full h-12 rounded-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-gray-900 font-semibold gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    {step === 'photo' ? 'Finish setup' : 'Continue'}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
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
