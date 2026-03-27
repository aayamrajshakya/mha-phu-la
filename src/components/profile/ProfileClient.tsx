'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, Post } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { getMoodStyle, MOODS } from '@/lib/moods'
import { MapPin, Heart, Edit2, LogOut, Camera, Check, X, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/time'

interface Props {
  profile: User | null
  posts: (Post & { likes_count: number })[]
}

export default function ProfileClient({ profile, posts }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: profile?.name ?? '',
    bio: profile?.bio ?? '',
    mood: profile?.mood ?? '',
    age: String(profile?.age ?? ''),
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')

  const mood = getMoodStyle(profile?.mood ?? null)

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    await supabase.from('profiles').update({
      name: form.name,
      bio: form.bio,
      mood: form.mood,
      age: Number(form.age),
      avatar_url: avatarUrl,
    }).eq('id', profile.id)
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `avatars/${profile.id}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
    }
    setUploading(false)
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
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
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
              {profile.address && (
                <span className="flex items-center gap-0.5 text-xs text-gray-400">
                  <MapPin className="w-3 h-3" />
                  {profile.address}
                </span>
              )}
            </div>

            {!editing && (
              <Badge className={`mt-2 text-xs ${mood.color} border-0`}>
                {mood.emoji} {mood.label}
              </Badge>
            )}
          </div>
        </div>

        {/* Mood picker (edit mode) */}
        {editing && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 font-medium mb-2">How are you feeling?</p>
            <div className="flex gap-2 flex-wrap">
              {MOODS.map(m => (
                <button
                  key={m.label}
                  onClick={() => setForm(f => ({ ...f, mood: m.label }))}
                  className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-all ${
                    form.mood === m.label ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  {m.emoji} {m.label}
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
        </div>
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
