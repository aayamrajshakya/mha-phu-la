import BottomNav from '@/components/layout/BottomNav'
import SideDrawer from '@/components/layout/SideDrawer'
import NotificationBell from '@/components/layout/NotificationBell'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch pending friend requests with sender profile for initial bell state
  type ReqRow = { id: string; created_at: string; requester: { id: string; name: string; avatar_url: string | null } }
  let initialRequests: ReqRow[] = []
  if (user) {
    const { data } = await supabase
      .from('connections')
      .select('id, created_at, requester:profiles!connections_requester_id_fkey(id, name, avatar_url)')
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialRequests = (data ?? []) as any
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-white shadow-sm">
      <SideDrawer />
      {user && (
        <NotificationBell userId={user.id} initialRequests={initialRequests} />
      )}
      <main className="flex-1 pb-20 overflow-y-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
