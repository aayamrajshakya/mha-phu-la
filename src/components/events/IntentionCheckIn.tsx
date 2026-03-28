'use client'

import { INTENTION_OPTIONS, KEYS, writeSession } from '@/lib/user-prefs'

interface Props {
  current: string | null
  onSelect: (id: string) => void
}

export default function IntentionCheckIn({ current, onSelect }: Props) {
  function select(id: string) {
    writeSession(KEYS.sessionIntention, id)
    onSelect(id)
  }

  return (
    <div className="px-4 py-4 bg-yellow-50 border-b border-yellow-100">
      <p className="text-xs font-semibold text-yellow-700 mb-0.5">What are you looking for right now?</p>
      <p className="text-[10px] text-yellow-500 mb-3">This session only · not saved to your profile</p>
      <div className="flex flex-wrap gap-2">
        {INTENTION_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => select(opt.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              current === opt.id
                ? 'bg-yellow-400 border-yellow-400 text-gray-900 shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:border-yellow-300'
            }`}
          >
            <span>{opt.emoji}</span> {opt.label}
          </button>
        ))}
        {current && (
          <button
            onClick={() => { writeSession(KEYS.sessionIntention, ''); onSelect('') }}
            className="px-3 py-1.5 rounded-full text-xs text-gray-400 border border-gray-100 hover:border-gray-200"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
