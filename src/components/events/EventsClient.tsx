'use client'

import { useState } from 'react'
import { MHEvent, EventCategory } from '@/lib/events'
import { MapPin, Clock, Users, Calendar, Tag } from 'lucide-react'

const CATEGORY_COLORS: Record<EventCategory, string> = {
  'Counseling':            'bg-blue-100 text-blue-700',
  'Support Group':         'bg-purple-100 text-purple-700',
  'Meditation':            'bg-teal-100 text-teal-700',
  'Yoga & Wellness':       'bg-green-100 text-green-700',
  'Art Therapy':           'bg-pink-100 text-pink-700',
  'Walking Group':         'bg-lime-100 text-lime-700',
  'Coffee Chat':           'bg-amber-100 text-amber-700',
  'Journaling Workshop':   'bg-orange-100 text-orange-700',
  'Recovery Circle':       'bg-indigo-100 text-indigo-700',
  'Social Anxiety Meetup': 'bg-rose-100 text-rose-700',
  'Grief Support':         'bg-slate-100 text-slate-700',
  'Mindfulness':           'bg-cyan-100 text-cyan-700',
  'Crisis Support':        'bg-red-100 text-red-700',
  'Anxiety Workshop':      'bg-yellow-100 text-yellow-700',
}

const ALL_CATEGORIES = 'All'

function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

interface Props {
  events: MHEvent[]
}

export default function EventsClient({ events }: Props) {
  const categories = [ALL_CATEGORIES, ...Array.from(new Set(events.map(e => e.category)))]
  const [active, setActive] = useState<string>(ALL_CATEGORIES)
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = active === ALL_CATEGORIES ? events : events.filter(e => e.category === active)

  return (
    <div className="flex flex-col">
      {/* Category filter pills */}
      <div className="px-4 py-3 overflow-x-auto flex gap-2 border-b border-gray-100 no-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              active === cat
                ? 'bg-yellow-400 border-yellow-400 text-gray-900'
                : 'bg-white border-gray-200 text-gray-500 hover:border-yellow-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="px-4 pt-3 pb-1 text-xs text-gray-400">{filtered.length} events coming up</p>

      {/* Event cards */}
      <div className="flex flex-col divide-y divide-gray-50 pb-24">
        {filtered.map(event => {
          const isOpen = expanded === event.id
          const spotsPct = event.spotsLeft / event.capacity
          const spotsColor = spotsPct === 0 ? 'text-red-500' : spotsPct < 0.25 ? 'text-orange-500' : 'text-green-600'

          return (
            <div key={event.id} className="px-4 py-4 bg-white hover:bg-gray-50/50 transition-colors">
              {/* Top row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1.5 ${CATEGORY_COLORS[event.category] ?? 'bg-gray-100 text-gray-500'}`}>
                    {event.category}
                  </span>
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug">{event.title}</h3>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-yellow-500">{formatDate(event.date)}</p>
                  <p className="text-[10px] text-gray-400">{event.time}</p>
                </div>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <MapPin className="w-3 h-3" /> {event.location}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Clock className="w-3 h-3" /> {event.durationMin} min
                </span>
                <span className={`flex items-center gap-1 text-[11px] font-medium ${spotsColor}`}>
                  <Users className="w-3 h-3" />
                  {event.spotsLeft === 0 ? 'Full' : `${event.spotsLeft} spots left`}
                </span>
              </div>

              {/* Expand toggle */}
              <button
                onClick={() => setExpanded(isOpen ? null : event.id)}
                className="text-[11px] text-yellow-500 mt-2 hover:underline"
              >
                {isOpen ? 'Show less' : 'Show more'}
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-gray-600 leading-relaxed">{event.description}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Hosted by {event.host}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {event.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-0.5 text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        <Tag className="w-2.5 h-2.5" /> {tag}
                      </span>
                    ))}
                  </div>

                  {/* Spots bar */}
                  <div className="mt-2">
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-yellow-400 transition-all"
                        style={{ width: `${((event.capacity - event.spotsLeft) / event.capacity) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{event.capacity - event.spotsLeft}/{event.capacity} registered</p>
                  </div>

                  <button
                    disabled={event.spotsLeft === 0}
                    className="mt-2 w-full py-2 rounded-full text-sm font-semibold bg-yellow-400 hover:bg-yellow-500 text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {event.spotsLeft === 0 ? 'Event Full' : 'Register Interest'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
