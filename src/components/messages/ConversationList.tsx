'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Conversation } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from '@/lib/time'
import { MessageCircle, SquarePen, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Friend {
  id: string
  name: string
  avatar_url: string | null
  mood: string | null
}

interface Props {
  conversations: Conversation[]
  currentUserId: string
  friends: Friend[]
}

export default function ConversationList({ conversations, currentUserId, friends }: Props) {
  const [composing, setComposing] = useState(false)
  const [starting, setStarting] = useState<string | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function openOrCreateConversation(friendId: string) {
    setStarting(friendId)
    setStartError(null)

    const { data: convId, error } = await supabase.rpc('create_conversation', {
      partner_id: friendId,
    })

    if (error || !convId) {
      setStarting(null)
      setStartError(error?.message ?? 'Something went wrong')
      return
    }

    router.push(`/messages/${convId}`)
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 z-10 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Messages</h1>
        {friends.length > 0 && (
          <button
            onClick={() => setComposing(true)}
            className="text-gray-500 hover:text-yellow-500 transition-colors"
          >
            <SquarePen className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Friends picker overlay */}
      {composing && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-end" onClick={() => setComposing(false)}>
          <div
            className="w-full max-w-lg mx-auto bg-white rounded-t-2xl pb-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-gray-900">New Message</span>
              <button onClick={() => setComposing(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            {startError && (
              <p className="text-xs text-red-500 px-4 py-2 bg-red-50">{startError}</p>
            )}
            <div className="divide-y divide-gray-50">
              {friends.map(friend => (
                <button
                  key={friend.id}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  disabled={starting === friend.id}
                  onClick={() => openOrCreateConversation(friend.id)}
                >
                  <Avatar className="w-11 h-11">
                    <AvatarImage src={friend.avatar_url ?? ''} />
                    <AvatarFallback className="bg-yellow-100 text-yellow-500 font-medium">
                      {friend.name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm text-gray-900">{friend.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {conversations.length === 0 ? (
        <div className="text-center py-20 text-gray-400 px-6">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">No conversations yet</p>
          <p className="text-sm mt-1">
            {friends.length > 0
              ? 'Tap the pencil icon to message a friend'
              : 'Connect with people first to start chatting'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {conversations.map(conv => (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={conv.other_user?.avatar_url ?? ''} />
                  <AvatarFallback className="bg-yellow-100 text-yellow-500 font-medium">
                    {conv.other_user?.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-gray-900">
                      {conv.other_user?.name}
                    </span>
                    {conv.last_message_at && (
                      <span className="text-[10px] text-gray-400">
                        {formatDistanceToNow(conv.last_message_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {conv.last_message ?? 'Start the conversation'}
                  </p>
                </div>

                {conv.unread_count > 0 && (
                  <span className="bg-yellow-400 text-gray-900 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {conv.unread_count}
                  </span>
                )}
              </Link>
          ))}
        </div>
      )}
    </div>
  )
}
