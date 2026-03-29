'use client'

import { useEffect, useState, useRef } from 'react'
import { Bell, UserPlus, MessageCircle, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type FriendReq = {
  id: string
  created_at: string
  requester: { id: string; name: string; avatar_url: string | null }
}

type MsgNotif = {
  id: string
  sender_name: string
  sender_avatar: string | null
  preview: string
  conversation_id: string
}

interface Props {
  userId: string
  initialRequests: FriendReq[]
}

export default function NotificationBell({ userId, initialRequests }: Props) {
  const [open, setOpen] = useState(false)
  const [requests, setRequests] = useState<FriendReq[]>(initialRequests)
  const [msgNotifs, setMsgNotifs] = useState<MsgNotif[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  // Avoid duplicate message notifications across re-renders
  const seenRef = useRef<Set<string>>(new Set())
  const pathname = usePathname()
  const supabase = createClient()

  // Clear message notifications when user visits messages
  useEffect(() => {
    if (pathname === '/messages' || pathname.startsWith('/messages/')) {
      setMsgNotifs([])
    }
  }, [pathname])

  // Realtime: new friend requests targeting this user
  useEffect(() => {
    const channel = supabase
      .channel(`notif-conn-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'connections', filter: `receiver_id=eq.${userId}` },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .eq('id', payload.new.requester_id)
            .single()
          if (profile) {
            setRequests(prev => [
              { id: payload.new.id, created_at: payload.new.created_at, requester: profile },
              ...prev,
            ])
          }
        }
      )
      // Remove request from list if it's accepted/deleted elsewhere
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'connections', filter: `receiver_id=eq.${userId}` },
        (payload) => {
          if (payload.new.status !== 'pending') {
            setRequests(prev => prev.filter(r => r.id !== payload.new.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Realtime: new messages (RLS ensures we only receive messages from our conversations)
  useEffect(() => {
    const channel = supabase
      .channel(`notif-msgs-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          // Ignore own messages and duplicates
          if (payload.new.sender_id === userId) return
          if (seenRef.current.has(payload.new.id)) return
          seenRef.current.add(payload.new.id)

          // Verify this message is in one of our conversations
          const { data: member } = await supabase
            .from('conversation_members')
            .select('conversation_id')
            .eq('conversation_id', payload.new.conversation_id)
            .eq('user_id', userId)
            .single()

          if (!member) return

          const { data: sender } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single()

          if (sender) {
            setMsgNotifs(prev => [
              {
                id: payload.new.id,
                sender_name: sender.name,
                sender_avatar: sender.avatar_url,
                preview: payload.new.content?.slice(0, 60) ?? '',
                conversation_id: payload.new.conversation_id,
              },
              ...prev,
            ].slice(0, 10))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const totalCount = requests.length + msgNotifs.length

  return (
    <div ref={panelRef} className="fixed top-3 right-3 z-50 max-w-[calc(theme(maxWidth.lg)+0px)]">
      {/* Bell button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative w-9 h-9 flex items-center justify-center bg-white rounded-full shadow-md border border-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-[18px] h-[18px]" />
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-11 right-0 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-sm text-gray-900">Notifications</p>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {totalCount === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="w-6 h-6 mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400">You&apos;re all caught up</p>
              </div>
            ) : (
              <>
                {/* Friend requests */}
                {requests.length > 0 && (
                  <section>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                      Friend Requests
                    </p>
                    {requests.map(req => (
                      <Link
                        key={req.id}
                        href="/connect"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <Avatar className="w-9 h-9 flex-shrink-0">
                          <AvatarImage src={req.requester.avatar_url ?? ''} />
                          <AvatarFallback className="bg-yellow-100 text-yellow-500 text-xs font-semibold">
                            {req.requester.name?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{req.requester.name}</p>
                          <p className="text-[11px] text-gray-400">Sent you a friend request</p>
                        </div>
                        <UserPlus className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      </Link>
                    ))}
                  </section>
                )}

                {/* Message notifications */}
                {msgNotifs.length > 0 && (
                  <section>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                      New Messages
                    </p>
                    {msgNotifs.map(msg => (
                      <Link
                        key={msg.id}
                        href={`/messages/${msg.conversation_id}`}
                        onClick={() => { setOpen(false); setMsgNotifs([]) }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <Avatar className="w-9 h-9 flex-shrink-0">
                          <AvatarImage src={msg.sender_avatar ?? ''} />
                          <AvatarFallback className="bg-blue-100 text-blue-500 text-xs font-semibold">
                            {msg.sender_name?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{msg.sender_name}</p>
                          <p className="text-[11px] text-gray-400 truncate">{msg.preview}</p>
                        </div>
                        <MessageCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      </Link>
                    ))}
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
