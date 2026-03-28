'use client'

import { Post } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Heart, MessageCircle, MapPin } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/time'

interface Props {
  post: Post
  currentUserId: string
  onLike: (postId: string, isLiked: boolean) => void
}

export default function PostCard({ post, onLike }: Props) {
  return (
    <div className="px-4 py-4 bg-white hover:bg-gray-50/50 transition-colors">
      <div className="flex gap-3">
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarImage src={post.user?.avatar_url ?? ''} />
          <AvatarFallback className="bg-yellow-100 text-yellow-500 text-sm font-medium">
            {post.user?.name?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{post.user?.name}</span>
            {post.is_suggested && (
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
          </div>
        </div>
      </div>
    </div>
  )
}
