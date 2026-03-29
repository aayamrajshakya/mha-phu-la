'use client'

import { useState } from 'react'
import { X, ThumbsUp, ThumbsDown } from 'lucide-react'
import { ReflectionData, KEYS, readLS, writeLS } from '@/lib/user-prefs'
import { MHEvent } from '@/lib/events'
import { recordActivityDay } from '@/lib/points'

interface Props {
  event: MHEvent
  onClose: () => void
  onSaved: (reflection: ReflectionData) => void
}

type Answer = boolean | null

function YesNo({ value, onChange }: { value: Answer; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onChange(true)}
        className={`flex items-center gap-1.5 flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
          value === true ? 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-gray-200 text-gray-500 hover:border-green-300'
        }`}
      >
        <ThumbsUp className="w-3.5 h-3.5 mx-auto" />
      </button>
      <button
        onClick={() => onChange(false)}
        className={`flex items-center gap-1.5 flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
          value === false ? 'bg-red-50 border-red-400 text-red-600' : 'bg-white border-gray-200 text-gray-500 hover:border-red-300'
        }`}
      >
        <ThumbsDown className="w-3.5 h-3.5 mx-auto" />
      </button>
    </div>
  )
}

export default function ReflectionDialog({ event, onClose, onSaved }: Props) {
  const [answers, setAnswers] = useState<{
    helpful: Answer; goAgain: Answer; comfortable: Answer; relevant: Answer
  }>({ helpful: null, goAgain: null, comfortable: null, relevant: null })

  function set(key: keyof typeof answers, val: boolean) {
    setAnswers(prev => ({ ...prev, [key]: val }))
  }

  function save() {
    const reflection: ReflectionData = {
      eventId: event.id,
      eventCategory: event.category,
      helpful: answers.helpful,
      goAgain: answers.goAgain,
      comfortable: answers.comfortable,
      relevant: answers.relevant,
      timestamp: new Date().toISOString(),
    }
    const existing = readLS<Record<string, ReflectionData>>(KEYS.reflections, {})
    writeLS(KEYS.reflections, { ...existing, [event.id]: reflection })
    onSaved(reflection)
    fetch('/api/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'reflection_completed', reference_id: event.id }),
    })
    recordActivityDay()
    onClose()
  }

  const canSave = Object.values(answers).some(v => v !== null)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl px-5 py-6 pb-28 shadow-xl">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-gray-900">How was it?</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-5">
          <span className="font-medium text-gray-600">{event.title}</span> · Your feedback stays private
        </p>

        <div className="flex flex-col gap-4">
          {([
            { key: 'helpful',     label: 'Was this helpful?' },
            { key: 'goAgain',     label: 'Would you go again?' },
            { key: 'comfortable', label: 'Did you feel comfortable?' },
            { key: 'relevant',    label: 'Was it relevant to you?' },
          ] as const).map(({ key, label }) => (
            <div key={key}>
              <p className="text-sm text-gray-700 mb-2">{label}</p>
              <YesNo
                value={answers[key]}
                onChange={v => set(key, v)}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full text-sm text-gray-500 border border-gray-200 hover:border-gray-300"
          >
            Skip
          </button>
          <button
            onClick={save}
            disabled={!canSave}
            className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-yellow-400 hover:bg-yellow-500 text-gray-900 disabled:opacity-40"
          >
            Save reflection
          </button>
        </div>
      </div>
    </div>
  )
}
