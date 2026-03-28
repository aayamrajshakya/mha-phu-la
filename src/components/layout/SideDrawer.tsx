'use client'

import { useState, useEffect } from 'react'
import { Menu, X, MapPin } from 'lucide-react'

const INTERESTS = [
  'Sports', 'Music', 'Dancing', 'Reading', 'Gaming',
  'Cooking', 'Travel', 'Art', 'Fitness', 'Movies',
  'Photography', 'Hiking', 'Yoga', 'Coffee', 'Food',
  'Volunteering', 'Nature', 'Theatre', 'Writing', 'Fashion',
  'Cycling', 'Swimming', 'Meditation', 'Board Games', 'Podcasts',
]

const INTERESTS_KEY = 'mhafu_interests'
export const RADIUS_KEY = 'mhafu_radius'
export const DEFAULT_RADIUS = 5

export default function SideDrawer() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [radius, setRadius] = useState(DEFAULT_RADIUS)

  useEffect(() => {
    try {
      const storedInterests = localStorage.getItem(INTERESTS_KEY)
      if (storedInterests) setSelected(new Set(JSON.parse(storedInterests)))

      const storedRadius = localStorage.getItem(RADIUS_KEY)
      if (storedRadius) setRadius(Number(storedRadius))
    } catch {}
  }, [])

  function toggle(interest: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(interest)) next.delete(interest)
      else next.add(interest)
      localStorage.setItem(INTERESTS_KEY, JSON.stringify([...next]))
      return next
    })
  }

  function handleRadius(val: number) {
    setRadius(val)
    localStorage.setItem(RADIUS_KEY, String(val))
  }

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 left-3 z-40 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-gray-600 hover:text-gray-900"
        aria-label="Open preferences"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-white z-50 shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Preferences</h2>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6">
          {/* Search radius */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Search radius</p>
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Nearby distance</span>
              <span className="text-sm font-bold text-yellow-500">{radius} mi</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={radius}
              onChange={e => handleRadius(Number(e.target.value))}
              className="w-full accent-yellow-400"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>1 mi</span>
              <span>50 mi</span>
            </div>
          </div>

          {/* Interests */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Interests</p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(interest => {
                const active = selected.has(interest)
                return (
                  <button
                    key={interest}
                    onClick={() => toggle(interest)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      active
                        ? 'bg-yellow-400 border-yellow-400 text-gray-900'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-yellow-300'
                    }`}
                  >
                    {interest}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">{selected.size} interest{selected.size !== 1 ? 's' : ''} selected</p>
          </div>
        )}
      </div>
    </>
  )
}
