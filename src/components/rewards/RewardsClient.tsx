'use client'

import { useState } from 'react'
import { User } from '@/types'
import OutingCard from './OutingCard'
import PlanOutingDialog from './PlanOutingDialog'
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
}

export default function RewardsClient({ friends, currentUserId }: Props) {
  const [outings, setOutings] = useState<LocalOuting[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)

  function handleCreated(outing: LocalOuting) {
    setOutings(prev => [outing, ...prev])
  }

  function handleUpdated(id: string, updates: Partial<LocalOuting>) {
    setOutings(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o))
  }

  const active = outings.filter(o => o.status === 'pending')
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
        {outings.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-semibold text-gray-900 mb-1">Go out, get rewarded!</p>
            <p className="text-sm text-gray-600">
              Plan an outing with a connection. Meet up, do a check-in together, and unlock real discounts — starting with <strong>20% off Starbucks</strong>.
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
                <OutingCard key={o.id} outing={o} onUpdated={handleUpdated} />
              ))}
            </div>
          </section>
        )}

        {completed.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Unlocked Rewards</h2>
            <div className="space-y-3">
              {completed.map(o => (
                <OutingCard key={o.id} outing={o} onUpdated={handleUpdated} />
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
