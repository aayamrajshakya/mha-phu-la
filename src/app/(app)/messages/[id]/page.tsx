export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import ChatWindow from '@/components/messages/ChatWindow'
import { notFound } from 'next/navigation'

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get conversation + members
  const { data: conv } = await supabase
    .from('conversations')
    .select(`*, conversation_members(user_id)`)
    .eq('id', id)
    .single()

  if (!conv) return notFound()

  const isParticipant = conv.conversation_members.some(
    (m: { user_id: string }) => m.user_id === user!.id
  )
  if (!isParticipant) return notFound()

  const partnerId = conv.conversation_members.find(
    (m: { user_id: string }) => m.user_id !== user!.id
  )?.user_id

  const { data: partner } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, mood')
    .eq('id', partnerId!)
    .single()

  // Fetch initial messages
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })
    .limit(100)

  return (
    <ChatWindow
      conversationId={id}
      currentUserId={user!.id}
      partner={partner!}
      initialMessages={messages ?? []}
    />
  )
}
