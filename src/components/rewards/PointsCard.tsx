'use client'

import { useEffect, useState } from 'react'
import { REDEMPTION_TIERS, getContributionTier, getWellbeingDaysThisMonth } from '@/lib/points'
import { PointEvent } from '@/types'
import { Sparkles, CalendarDays, Star } from 'lucide-react'

const REASON_LABELS: Record<PointEvent['reason'], string> = {
  outing_complete:      'Went out with a friend',
  post_created:         'Shared in the community',
  event_registered:     'Joined an event',
  reflection_completed: 'Completed a reflection',
}

interface Props {
  points: number
  pointEvents: PointEvent[]
  postCount: number
  outingCount: number
  reflectionCount: number
}

export default function PointsCard({ points, pointEvents, postCount, outingCount, reflectionCount }: Props) {
  const [wellbeingDays, setWellbeingDays] = useState(0)

  useEffect(() => {
    setWellbeingDays(getWellbeingDaysThisMonth())
  }, [])

  const tier = getContributionTier(postCount, reflectionCount, outingCount)

  // Find the next reachable tier (or show last if all unlocked)
  const nextTier = REDEMPTION_TIERS.find(t => points < t.points)
  const unlockedTiers = REDEMPTION_TIERS.filter(t => points >= t.points)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Points header */}
      <div className="bg-yellow-400 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-yellow-800">Your wellbeing points</p>
            <p className="text-4xl font-black text-gray-900 leading-none mt-0.5">{points}</p>
          </div>
          <Sparkles className="w-8 h-8 text-yellow-700 opacity-60" />
        </div>

        {/* Contribution tier */}
        <div className="mt-3 flex items-center gap-1.5">
          <Star className="w-3 h-3 text-yellow-700" />
          <span className="text-xs font-semibold text-yellow-800">{tier}</span>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Wellbeing days */}
        {wellbeingDays > 0 && (
          <div className="flex items-center gap-2.5">
            <CalendarDays className="w-4 h-4 text-teal-500 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              You&apos;ve shown up <span className="font-semibold text-teal-600">{wellbeingDays} day{wellbeingDays !== 1 ? 's' : ''}</span> this month — great going 🌱
            </p>
          </div>
        )}

        {/* Unlocked rewards */}
        {unlockedTiers.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Unlocked rewards</p>
            <div className="space-y-1.5">
              {unlockedTiers.map(t => (
                <div key={t.type} className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2">
                  <span className="text-base">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-green-800">{t.label}</p>
                    <p className="text-[10px] text-green-600">{t.desc}</p>
                  </div>
                  <span className="text-[10px] font-bold text-green-700">{t.points} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next milestone — framed positively, not as pressure */}
        {nextTier && (
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-xs text-gray-500">
              {nextTier.emoji} <span className="font-medium text-gray-700">{nextTier.label}</span> unlocks at {nextTier.points} pts
            </p>
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-1.5 bg-yellow-400 rounded-full transition-all"
                style={{ width: `${Math.min(100, (points / nextTier.points) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Recent activity */}
        {pointEvents.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent</p>
            <div className="space-y-1">
              {pointEvents.map(e => (
                <div key={e.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{REASON_LABELS[e.reason]}</span>
                  <span className="font-semibold text-yellow-600">+{e.amount} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {points === 0 && pointEvents.length === 0 && (
          <p className="text-xs text-gray-400 text-center pb-1">
            Plan an outing or share a post to earn your first points ✨
          </p>
        )}
      </div>
    </div>
  )
}
