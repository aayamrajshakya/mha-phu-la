'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, Post } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { MapPin, Heart, Edit2, LogOut, Camera, Check, X, Loader2, Users, UserMinus, ZoomIn, ZoomOut } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/time'

type Friend = { id: string; name: string; avatar_url: string | null; mood: string | null; connection_id: string }

interface Props {
  profile: User | null
  posts: (Post & { likes_count: number })[]
  friends: Friend[]
}

// ---------------------------------------------------------------------------
// Crop modal
// ---------------------------------------------------------------------------
function CropModal({
  src,
  onConfirm,
  onCancel,
}: {
  src: string
  onConfirm: (blob: Blob) => void
  onCancel: () => void
}) {
  const containerSize = 280
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const fit = Math.max(containerSize / img.width, containerSize / img.height)
      setScale(fit)
      setImgSize({ w: img.width, h: img.height })
      setOffset({ x: 0, y: 0 })
    }
    img.src = src
  }, [src])

  const clampOffset = useCallback((ox: number, oy: number, sc: number) => {
    const displayW = imgSize.w * sc
    const displayH = imgSize.h * sc
    const maxX = Math.max(0, (displayW - containerSize) / 2)
    const maxY = Math.max(0, (displayH - containerSize) / 2)
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    }
  }, [imgSize, containerSize])

  function onPointerDown(e: React.PointerEvent) {
    dragging.current = true
    last.current = { x: e.clientX, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return
    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y
    last.current = { x: e.clientX, y: e.clientY }
    setOffset(prev => clampOffset(prev.x + dx, prev.y + dy, scale))
  }

  function onPointerUp() { dragging.current = false }

  function changeScale(delta: number) {
    setScale(prev => {
      const minFit = Math.max(containerSize / imgSize.w, containerSize / imgSize.h)
      const next = Math.max(minFit, Math.min(4, prev + delta))
      setOffset(o => clampOffset(o.x, o.y, next))
      return next
    })
  }

  function handleConfirm() {
    const outputSize = 400
    const canvas = document.createElement('canvas')
    canvas.width = outputSize
    canvas.height = outputSize
    const ctx = canvas.getContext('2d')!
    const img = imgRef.current!

    // scale factor from display coords → natural image coords
    const displayW = imgSize.w * scale
    const displayH = imgSize.h * scale
    // top-left of image in container coords
    const imgLeft = (containerSize / 2) + offset.x - displayW / 2
    const imgTop  = (containerSize / 2) + offset.y - displayH / 2
    // crop box in container coords (centered square)
    const cropLeft = 0
    const cropTop  = 0
    // map to source image coords
    const srcX = (cropLeft - imgLeft) / scale
    const srcY = (cropTop  - imgTop)  / scale
    const srcSize = containerSize / scale

    // circular clip
    ctx.beginPath()
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, outputSize, outputSize)

    canvas.toBlob(blob => { if (blob) onConfirm(blob) }, 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl shadow-xl w-80 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">Crop photo</p>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        {/* Crop viewport */}
        <div className="flex items-center justify-center py-4 bg-gray-900">
          <div
            className="relative overflow-hidden rounded-full cursor-grab active:cursor-grabbing"
            style={{ width: containerSize, height: containerSize }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt="crop preview"
              draggable={false}
              style={{
                width: imgSize.w * scale,
                height: imgSize.h * scale,
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                userSelect: 'none',
              }}
            />
            {/* circle border overlay */}
            <div className="absolute inset-0 rounded-full ring-2 ring-white/60 pointer-events-none" />
          </div>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-gray-100">
          <button onClick={() => changeScale(-0.1)} className="text-gray-400 hover:text-gray-700">
            <ZoomOut className="w-4 h-4" />
          </button>
          <input
            type="range"
            min={50} max={400} step={5}
            value={Math.round(scale * 100)}
            onChange={e => {
              const next = Number(e.target.value) / 100
              setScale(next)
              setOffset(o => clampOffset(o.x, o.y, next))
            }}
            className="flex-1 accent-yellow-400"
          />
          <button onClick={() => changeScale(0.1)} className="text-gray-400 hover:text-gray-700">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <p className="text-center text-[10px] text-gray-400 pb-1">Drag to reposition</p>

        <div className="flex gap-2 px-4 pb-4">
          <button onClick={onCancel} className="flex-1 py-2 rounded-full border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleConfirm} className="flex-1 py-2 rounded-full bg-yellow-400 hover:bg-yellow-500 text-sm font-semibold text-gray-900">
            Use photo
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ProfileClient({ profile, posts, friends: initialFriends }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: profile?.name ?? '',
    bio: profile?.bio ?? '',
    mood: profile?.mood ?? '',
    age: String(profile?.age ?? ''),
    gender: profile?.gender ?? '',
  })

  const GENDERS = [
    { label: 'Male',   symbol: '♂', symbolClass: 'text-blue-500' },
    { label: 'Female', symbol: '♀', symbolClass: 'text-pink-500' },
    { label: 'Other',  symbol: '⚧', symbolClass: 'bg-gradient-to-r from-blue-500 to-pink-500 bg-clip-text text-transparent' },
  ]

  const [friends, setFriends] = useState(initialFriends)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    await supabase.from('profiles').update({
      name: form.name,
      bio: form.bio,
      mood: form.mood,
      age: Number(form.age),
      gender: form.gender,
      avatar_url: avatarUrl,
    }).eq('id', profile.id)
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setCropSrc(ev.target?.result as string)
    reader.readAsDataURL(file)
    // reset so same file can be re-selected
    e.target.value = ''
  }

  async function handleCropConfirm(blob: Blob) {
    if (!profile) return
    setCropSrc(null)
    setUploading(true)
    setUploadError(null)
    const path = `${profile.id}/avatar.jpg`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (error) {
      setUploadError(error.message)
    } else {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      // cache-bust so browser doesn't serve the old image
      setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`)
    }
    setUploading(false)
  }

  async function handleUnfriend(connectionId: string) {
    await supabase.from('connections').delete().eq('id', connectionId)
    setFriends(prev => prev.filter(f => f.connection_id !== connectionId))
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Profile not found. <a href="/onboarding" className="text-yellow-400">Complete setup</a></p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {cropSrc && (
        <CropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}

      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Profile</h1>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-8 w-8 p-0 text-gray-500">
                <X className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 rounded-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-3">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-8 w-8 p-0 text-gray-500">
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleSignOut} className="h-8 w-8 p-0 text-gray-400">
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Profile card */}
      <div className="px-4 pt-6 pb-4 bg-white">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="w-20 h-20">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-yellow-100 text-yellow-500 text-2xl font-bold">
                {profile.name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {editing && (
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer">
                {uploading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              </label>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="h-9 rounded-lg font-semibold mb-1"
                placeholder="Your name"
              />
            ) : (
              <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
            )}

            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-gray-500">{profile.age} years old</span>
              {profile.gender && (() => {
                const g = GENDERS.find(x => x.label === profile.gender)
                return g ? (
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <span className={`text-lg leading-none ${g.symbolClass}`}>{g.symbol}</span> {g.label}
                  </span>
                ) : null
              })()}
              {profile.address && (
                <span className="flex items-center gap-0.5 text-xs text-gray-400">
                  <MapPin className="w-3 h-3" />
                  {profile.address}
                </span>
              )}
            </div>

            {uploadError && (
              <p className="text-xs text-red-500 mt-1">{uploadError}</p>
            )}
          </div>
        </div>

        {/* Gender picker (edit mode) */}
        {editing && (
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-2">Gender</p>
            <div className="flex gap-2">
              {GENDERS.map(g => (
                <button
                  key={g.label}
                  onClick={() => setForm(f => ({ ...f, gender: g.label }))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                    form.gender === g.label
                      ? 'border-yellow-400 bg-yellow-50 text-gray-900'
                      : 'border-gray-100 bg-white text-gray-500 hover:border-yellow-200'
                  }`}
                >
                  <span className={`text-lg leading-none ${g.symbolClass}`}>{g.symbol}</span> {g.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bio */}
        <div className="mt-4">
          {editing ? (
            <Textarea
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Tell your story..."
              rows={3}
              className="rounded-xl resize-none text-sm"
            />
          ) : profile.bio ? (
            <p className="text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
          ) : null}
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-4 pt-4 border-t border-gray-50">
          <div className="text-center">
            <p className="font-bold text-gray-900">{posts.length}</p>
            <p className="text-xs text-gray-500">Posts</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-900">{posts.reduce((sum, p) => sum + p.likes_count, 0)}</p>
            <p className="text-xs text-gray-500">Hearts</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-900">{friends.length}</p>
            <p className="text-xs text-gray-500">Friends</p>
          </div>
        </div>
      </div>

      {/* Friends */}
      <div className="mt-2">
        <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> Friends
        </p>
        {friends.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">No friends yet — connect with someone!</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-50">
            {friends.map(friend => (
              <div key={friend.id} className="px-4 py-3 bg-white flex items-center gap-3">
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarImage src={friend.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-yellow-100 text-yellow-500 font-bold">
                    {friend.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm font-semibold text-gray-900 truncate flex-1">{friend.name}</p>
                <button
                  onClick={() => handleUnfriend(friend.connection_id)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Posts */}
      <div className="mt-2">
        <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Your posts</p>
        {posts.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">No posts yet — share something!</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {posts.map(post => (
              <div key={post.id} className="px-4 py-3 bg-white">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                {post.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.image_url} alt="" className="mt-2 rounded-xl max-h-48 object-cover w-full" />
                )}
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Heart className="w-3.5 h-3.5" />
                    {post.likes_count}
                  </span>
                  <span className="text-[10px] text-gray-300">{formatDistanceToNow(post.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
