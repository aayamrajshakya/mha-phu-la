'use client'

import { OUTING_TYPES, OutingType } from '@/lib/rewards'

export default function RewardCoupon({ type }: { type: OutingType }) {
  const r = OUTING_TYPES[type]
  return (
    <div className={`rounded-2xl border-2 border-dashed p-4 ${r.color} mt-3`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">{r.partner}</p>
          <p className="text-2xl font-black text-gray-900">{r.discount}</p>
        </div>
        <span className="text-4xl">{r.emoji}</span>
      </div>
      <div className="bg-white rounded-xl px-4 py-2 text-center mb-2">
        <p className="font-mono font-bold text-lg tracking-widest text-gray-900">{r.code}</p>
      </div>
      <p className="text-xs text-gray-500 text-center">{r.note}</p>
    </div>
  )
}
