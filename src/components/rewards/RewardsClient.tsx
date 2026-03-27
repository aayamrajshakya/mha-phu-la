'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Outing, User } from '@/types'
import OutingCard from './OutingCard'
import PlanOutingDialog from './PlanOutingDialog'
import { Button } from '@/components/ui/button'
import { Gift, Plus } from 'lucide-react'

interface Props {
  outings: (Outing & { is_creator: boolean })[]
  friends: Pick<User, 'id' | 'name' | 'avatar_url'>[]
  currentUserId: string
}

export default function RewardsClient({ outings, friends, currentUserId }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const router = useRouter()

  const refresh = useCallback(() => router.refresh(), [router])

  const active = outings.filter(o => o.status === 'pending')
  const completed = outings.filter(o => o.status === 'completed')

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
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
        {/* How it works banner */}
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

        {/* Active outings */}
        {active.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Active</h2>
            <div className="space-y-3">
              {active.map(o => (
                <OutingCard key={o.id} outing={o} onUpdate={refresh} />
              ))}
            </div>
          </section>
        )}

        {/* Completed / unlocked rewards */}
        {completed.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Unlocked Rewards</h2>
            <div className="space-y-3">
              {completed.map(o => (
                <OutingCard key={o.id} outing={o} onUpdate={refresh} />
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
        onCreated={refresh}
      />
    </div>
  )
}
