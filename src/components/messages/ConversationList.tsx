'use client'

import Link from 'next/link'
import { Conversation } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getMoodStyle } from '@/lib/moods'
import { formatDistanceToNow } from '@/lib/time'
import { MessageCircle } from 'lucide-react'

interface Props {
  conversations: Conversation[]
  currentUserId: string
}

export default function ConversationList({ conversations }: Props) {
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 z-10">
        <h1 className="text-xl font-bold text-gray-900">Messages</h1>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-20 text-gray-400 px-6">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">No conversations yet</p>
          <p className="text-sm mt-1">Connect with people from the feed to start chatting</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {conversations.map(conv => {
            const mood = getMoodStyle(conv.other_user?.mood ?? null)
            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={conv.other_user?.avatar_url ?? ''} />
                    <AvatarFallback className="bg-violet-100 text-violet-700 font-medium">
                      {conv.other_user?.name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 text-xs">
                    {mood.emoji}
                  </span>
                </div>

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
                  <span className="bg-violet-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {conv.unread_count}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
