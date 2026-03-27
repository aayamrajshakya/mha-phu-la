export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import ChatWindow from '@/components/messages/ChatWindow'
import { notFound } from 'next/navigation'

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check membership directly (avoids self-referential RLS issue on the join)
  const { data: membership } = await supabase
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', id)
    .eq('user_id', user!.id)
    .single()

  if (!membership) return notFound()

  // Fetch all members to find the partner
  const { data: members } = await supabase
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', id)

  const partnerId = (members ?? []).find(m => m.user_id !== user!.id)?.user_id

  if (!partnerId) return notFound()

  const { data: partner } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, mood')
    .eq('id', partnerId)
    .single()

  if (!partner) return notFound()

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
      partner={partner}
      initialMessages={messages ?? []}
    />
  )
}
