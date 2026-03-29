'use client'

import { useState } from 'react'
import { User, PointEvent } from '@/types'
import OutingCard from './OutingCard'
import PlanOutingDialog from './PlanOutingDialog'
import PointsCard from './PointsCard'
import { Button } from '@/components/ui/button'
import { Gift, Plus } from 'lucide-react'
import { OutingType } from '@/lib/rewards'

export type LocalOuting = {
  id: string
  type: OutingType
  status: 'pending' | 'completed'
  is_creator: boolean
  checkin_code: string | null
  checkin_code_expires_at: string | null
  partner: { id: string; name: string; avatar_url: string | null }
  created_at: string
}

interface Props {
  friends: Pick<User, 'id' | 'name' | 'avatar_url'>[]
  currentUserId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialOutings: any[]
  userPoints: number
  pointEvents: PointEvent[]
  postCount: number
  outingCount: number
  reflectionCount: number
}

function toLocalOuting(raw: Record<string, unknown>, currentUserId: string): LocalOuting {
  const partner = (raw.creator_id === currentUserId ? raw.partner : raw.creator) as {
    id: string; name: string; avatar_url: string | null
  }
  return {
    id:                     raw.id as string,
    type:                   raw.type as OutingType,
    status:                 raw.status as 'pending' | 'completed',
    is_creator:             raw.creator_id === currentUserId,
    checkin_code:           (raw.checkin_code as string | null) ?? null,
    checkin_code_expires_at:(raw.checkin_code_expires_at as string | null) ?? null,
    partner,
    created_at:             raw.created_at as string,
  }
}

export default function RewardsClient({
  friends,
  currentUserId,
  initialOutings,
  userPoints,
  pointEvents,
  postCount,
  outingCount,
  reflectionCount,
}: Props) {
  const [outings, setOutings] = useState<LocalOuting[]>(
    initialOutings.map(o => toLocalOuting(o, currentUserId))
  )
  const [points, setPoints] = useState(userPoints)
  const [events, setEvents] = useState<PointEvent[]>(pointEvents)
  const [dialogOpen, setDialogOpen] = useState(false)

  function handleCreated(outing: LocalOuting) {
    setOutings(prev => [outing, ...prev])
  }

  function handleUpdated(id: string, updates: Partial<LocalOuting>) {
    setOutings(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o))
  }

  function handlePointsEarned(amount: number, reason: PointEvent['reason']) {
    setPoints(prev => prev + amount)
    const newEvent: PointEvent = {
      id: crypto.randomUUID(),
      user_id: currentUserId,
      amount,
      reason,
      reference_id: null,
      created_at: new Date().toISOString(),
    }
    setEvents(prev => [newEvent, ...prev].slice(0, 5))
  }

  const active    = outings.filter(o => o.status === 'pending')
  const completed = outings.filter(o => o.status === 'completed')

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-yellow-500" />
            <h1 className="text-xl font-bold text-gray-900">Rewards</h1>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            size="sm"
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-full gap-1"
          >
            <Plus className="w-4 h-4" />
            Plan outing
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-6">
        {/* Points + wellbeing summary */}
        <PointsCard
          points={points}
          pointEvents={events}
          postCount={postCount}
          outingCount={outingCount}
          reflectionCount={reflectionCount}
        />

        {/* Empty state */}
        {outings.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-semibold text-gray-900 mb-1">Go out, get rewarded!</p>
            <p className="text-sm text-gray-600">
              Plan an outing with a friend. Meet up, do a check-in together, and unlock real discounts — and earn <strong>50 points each</strong>.
            </p>
            <Button
              onClick={() => setDialogOpen(true)}
              className="mt-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-full"
            >
              Plan your first outing
            </Button>
          </div>
        )}

        {active.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Active</h2>
            <div className="space-y-3">
              {active.map(o => (
                <OutingCard
                  key={o.id}
                  outing={o}
                  onUpdated={handleUpdated}
                  onPointsEarned={handlePointsEarned}
                />
              ))}
            </div>
          </section>
        )}

        {completed.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Unlocked Rewards</h2>
            <div className="space-y-3">
              {completed.map(o => (
                <OutingCard
                  key={o.id}
                  outing={o}
                  onUpdated={handleUpdated}
                  onPointsEarned={handlePointsEarned}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <PlanOutingDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        friends={friends}
        currentUserId={currentUserId}
        onCreated={handleCreated}
      />
    </div>
  )
}
