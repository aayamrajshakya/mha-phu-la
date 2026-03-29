'use client'

import { useState } from 'react'
import { Post } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Heart, MessageCircle, MapPin, X, UserPlus, Check, Loader2, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/time'

const GENDER_SYMBOL: Record<string, { symbol: string; cls: string }> = {
  Male:   { symbol: '♂', cls: 'text-blue-500' },
  Female: { symbol: '♀', cls: 'text-pink-500' },
  Other:  { symbol: '⚧', cls: 'bg-gradient-to-r from-blue-500 to-pink-500 bg-clip-text text-transparent' },
}

interface Props {
  post: Post
  currentUserId: string
  onLike: (postId: string, isLiked: boolean) => void
  onDelete: (postId: string) => void
}

export default function PostCard({ post, currentUserId, onLike, onDelete }: Props) {
  const [popupOpen, setPopupOpen] = useState(false)
  const [addState, setAddState] = useState<'idle' | 'loading' | 'sent'>('idle')
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  const isOwn = post.user_id === currentUserId

  async function handleDelete() {
    if (!confirm('Delete this post?')) return
    setDeleting(true)
    await supabase.from('posts').delete().eq('id', post.id)
    onDelete(post.id)
  }

  const isSuggested = post.is_suggested
  const author = post.user
  const gender = author.gender ? GENDER_SYMBOL[author.gender] : null

  async function handleAddFriend() {
    if (addState !== 'idle') return
    setAddState('loading')
    await supabase.from('connections').insert({
      requester_id: currentUserId,
      receiver_id: author.id,
      status: 'pending',
    })
    setAddState('sent')
  }

  return (
    <>
      <div className="px-4 py-4 bg-white hover:bg-gray-50/50 transition-colors">
        <div className="flex gap-3">
          {/* Avatar — clickable for suggested users */}
          <button
            className={isSuggested ? 'cursor-pointer' : 'cursor-default'}
            onClick={() => isSuggested && setPopupOpen(true)}
          >
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src={author?.avatar_url ?? ''} />
              <AvatarFallback className="bg-yellow-100 text-yellow-500 text-sm font-medium">
                {author?.name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Name — clickable for suggested users */}
              <button
                className={`font-semibold text-gray-900 text-sm ${isSuggested ? 'hover:underline cursor-pointer' : 'cursor-default'}`}
                onClick={() => isSuggested && setPopupOpen(true)}
              >
                {author?.name}
              </button>
              {isSuggested && (
                <Badge variant="secondary" className="text-[10px] px-2 py-0 bg-gray-100 text-gray-400 border-0">
                  Suggested
                </Badge>
              )}
              {post.distance_km != null && (
                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {post.distance_km < 1 ? '< 1 km' : `${Math.round(post.distance_km)} km`}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mb-2">
              {formatDistanceToNow(post.created_at)}
            </p>

            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </p>

            {post.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.image_url}
                alt="post"
                className="mt-3 rounded-2xl w-full max-h-64 object-cover"
              />
            )}

            <div className="flex items-center gap-5 mt-3">
              <button
                onClick={() => onLike(post.id, post.is_liked ?? false)}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  post.is_liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
                }`}
              >
                <Heart className={`w-4 h-4 ${post.is_liked ? 'fill-current' : ''}`} />
                <span>{post.likes_count}</span>
              </button>
              <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-yellow-500 transition-colors">
                <MessageCircle className="w-4 h-4" />
                <span>{post.comments_count ?? 0}</span>
              </button>
              {isOwn && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="ml-auto flex items-center gap-1 text-xs text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile popup */}
      {popupOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setPopupOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl px-6 pt-5 pb-6 shadow-xl mx-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <div className="flex items-center justify-end mb-4">
              <button onClick={() => setPopupOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile info */}
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={author?.avatar_url ?? ''} />
                <AvatarFallback className="bg-yellow-100 text-yellow-500 text-xl font-bold">
                  {author?.name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-gray-900 text-lg leading-tight">{author.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {author.age && (
                    <span className="text-sm text-gray-500">{author.age} years old</span>
                  )}
                  {gender && (
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <span className={`text-lg leading-none ${gender.cls}`}>{gender.symbol}</span>
                      {author.gender}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {author.bio && (
              <p className="text-sm text-gray-600 leading-relaxed mb-5">{author.bio}</p>
            )}

            <button
              onClick={handleAddFriend}
              disabled={addState !== 'idle'}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold transition-colors ${
                addState === 'sent'
                  ? 'bg-green-100 text-green-700 cursor-default'
                  : 'bg-yellow-400 hover:bg-yellow-500 text-gray-900 disabled:opacity-60'
              }`}
            >
              {addState === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : addState === 'sent' ? (
                <><Check className="w-4 h-4" /> Request sent</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Add friend</>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
