export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import ConversationList from '@/components/messages/ConversationList'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch conversations with last message and other user info
  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      id,
      created_at,
      conversation_members!inner(user_id),
      messages(content, created_at, sender_id)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  // Get all conversation partner IDs
  const partnerIds = (conversations ?? []).flatMap(c =>
    c.conversation_members
      .filter((m: { user_id: string }) => m.user_id !== user!.id)
      .map((m: { user_id: string }) => m.user_id)
  )

  const { data: partners } = partnerIds.length > 0
    ? await supabase.from('profiles').select('id, name, avatar_url, mood').in('id', partnerIds)
    : { data: [] }

  const partnerMap = Object.fromEntries((partners ?? []).map(p => [p.id, p]))

  const formattedConvs = (conversations ?? []).map(c => {
    const partnerId = c.conversation_members
      .find((m: { user_id: string }) => m.user_id !== user!.id)?.user_id
    const msgs = (c.messages ?? []).sort(
      (a: { created_at: string }, b: { created_at: string }) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const lastMsg = msgs[0]
    return {
      id: c.id,
      created_at: c.created_at,
      last_message: lastMsg?.content ?? null,
      last_message_at: lastMsg?.created_at ?? null,
      other_user: partnerMap[partnerId!] ?? null,
      unread_count: 0,
    }
  }).filter(c => c.other_user !== null)

  // Fetch friends (accepted connections) for new conversation picker
  const { data: sentConns } = await supabase
    .from('connections')
    .select('receiver:profiles!connections_receiver_id_fkey(id, name, avatar_url, mood)')
    .eq('requester_id', user!.id)
    .eq('status', 'accepted')

  const { data: receivedConns } = await supabase
    .from('connections')
    .select('requester:profiles!connections_requester_id_fkey(id, name, avatar_url, mood)')
    .eq('receiver_id', user!.id)
    .eq('status', 'accepted')

  type FriendRow = { id: string; name: string; avatar_url: string | null; mood: string | null }
  const seenFriendIds = new Set<string>()
  const friends: FriendRow[] = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(sentConns ?? []).map((c: any) => c.receiver as FriendRow),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(receivedConns ?? []).map((c: any) => c.requester as FriendRow),
  ].filter(Boolean).filter(f => {
    if (seenFriendIds.has(f.id)) return false
    seenFriendIds.add(f.id)
    return true
  })

  return <ConversationList conversations={formattedConvs} currentUserId={user!.id} friends={friends} />
}
