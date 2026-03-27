'use client'

import { OUTING_TYPES, OutingType } from '@/lib/rewards'

interface Props {
  type: OutingType
  myHalf: string
  partnerName: string
}

export default function RewardCoupon({ type, myHalf, partnerName }: Props) {
  const r = OUTING_TYPES[type]
  return (
    <div className={`rounded-2xl border-2 border-dashed p-4 ${r.color} mt-3`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">{r.partner}</p>
          <p className="text-2xl font-black text-gray-900">{r.discount}</p>
        </div>
        <span className="text-4xl">{r.emoji}</span>
      </div>

      <div className="bg-white rounded-xl px-4 py-3 mb-2 space-y-2">
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">Your half of the code</p>
          <p className="font-mono font-black text-2xl tracking-widest text-gray-900">{myHalf}</p>
        </div>
        <div className="border-t border-dashed border-gray-200 pt-2 text-center">
          <p className="text-xs text-gray-400 mb-1">{partnerName}'s half</p>
          <p className="font-mono font-black text-2xl tracking-widest text-gray-300">????</p>
        </div>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Ask {partnerName} for their half — combine both to get the full discount code.
      </p>
      <p className="text-xs text-gray-400 text-center mt-1">{r.note}</p>
    </div>
  )
}
