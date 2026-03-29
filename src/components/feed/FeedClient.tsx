'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Post } from '@/types'
import PostCard from './PostCard'
import CreatePost from './CreatePost'
interface Props {
  posts: Post[]
  currentUser: User | null
}

export default function FeedClient({ posts: initialPosts, currentUser }: Props) {
  const [posts, setPosts] = useState(initialPosts)
  const supabase = createClient()

  async function handleNewPost(content: string, imageUrl?: string) {
    if (!currentUser) return
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: currentUser.id,
        content,
        image_url: imageUrl ?? null,
      })
      .select(`*, user:profiles!posts_user_id_fkey(id, name, avatar_url)`)
      .single()

    if (!error && data) {
      setPosts(prev => [{ ...data, likes_count: 0, is_liked: false }, ...prev])
    }
  }

  async function handleDelete(postId: string) {
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  async function handleLike(postId: string, isLiked: boolean) {
    if (!currentUser) return
    if (isLiked) {
      await supabase.from('post_likes').delete()
        .eq('post_id', postId).eq('user_id', currentUser.id)
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUser.id })
    }
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, is_liked: !isLiked, likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1 }
        : p
    ))
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Feed</h1>
        </div>
      </div>

      {/* Create post */}
      {currentUser && (
        <CreatePost currentUser={currentUser} onPost={handleNewPost} />
      )}

      {/* Posts */}
      <div className="flex flex-col divide-y divide-gray-50">
        {posts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">💙</p>
            <p className="font-medium">No posts yet</p>
            <p className="text-sm mt-1">Be the first to share something</p>
          </div>
        ) : (
          posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUser?.id ?? ''}
              onLike={handleLike}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}
