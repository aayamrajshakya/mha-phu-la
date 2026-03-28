export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MapWrapper from '@/components/map/MapWrapper'

export default async function MapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 5rem)' }}>
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 z-10">
        <h1 className="text-xl font-bold text-gray-900">Map</h1>
      </div>
      <div className="flex-1 min-h-0">
        <MapWrapper currentUserId={user.id} />
      </div>
    </div>
  )
}
