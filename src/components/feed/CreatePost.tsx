'use client'

import { useState } from 'react'
import { User } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Image as ImageIcon, Send, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  currentUser: User
  onPost: (content: string, imageUrl?: string) => void
}

export default function CreatePost({ currentUser, onPost }: Props) {
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)
  const supabase = createClient()

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `posts/${currentUser.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('posts').upload(path, file)
    if (!error) {
      const { data } = supabase.storage.from('posts').getPublicUrl(path)
      setImageUrl(data.publicUrl)
    }
    setUploading(false)
  }

  async function handleSubmit() {
    if (!content.trim()) return
    setPosting(true)
    await onPost(content.trim(), imageUrl || undefined)
    setContent('')
    setImageUrl('')
    setPosting(false)
  }

  return (
    <div className="px-4 py-3 border-b border-gray-100 bg-white">
      <div className="flex gap-3">
        <Avatar className="w-9 h-9 flex-shrink-0">
          <AvatarImage src={currentUser.avatar_url ?? ''} />
          <AvatarFallback className="bg-yellow-100 text-yellow-500 text-sm font-medium">
            {currentUser.name?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 flex flex-col gap-2">
          <Textarea
            placeholder="Share how you&apos;re feeling or what&apos;s on your mind..."
            value={content}
            onChange={e => setContent(e.target.value)}
            className="resize-none border-0 p-0 shadow-none text-sm focus-visible:ring-0 min-h-[60px]"
            rows={2}
          />
          {imageUrl && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="post" className="rounded-xl max-h-48 object-cover w-full" />
              <button
                onClick={() => setImageUrl('')}
                className="absolute top-1.5 right-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full p-0.5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <label className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              uploading ? 'text-gray-400 border-gray-200' : 'text-gray-500 border-gray-200 hover:border-yellow-400 hover:text-yellow-500'
            }`}>
              {uploading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
              ) : (
                <><ImageIcon className="w-3.5 h-3.5" /> Photo</>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!content.trim() || posting}
              className="rounded-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-gray-900 h-8 px-4 gap-1.5"
            >
              {posting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
