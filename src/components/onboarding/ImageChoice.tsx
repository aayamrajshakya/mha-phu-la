'use client'

import { Check } from 'lucide-react'

export interface ImageOption {
  id: string
  label: string
  imageUrl: string
}

interface Props {
  options: [ImageOption, ImageOption]
  selected: string | null
  onChange: (id: string) => void
}

/**
 * Two-up image picker — click an image (or its checkmark) to select it.
 * Both images share the same height so they align side-by-side.
 */
export function ImageChoice({ options, selected, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt) => {
        const active = selected === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`relative rounded-2xl overflow-hidden border-2 text-left transition-all focus:outline-none ${
              active
                ? 'border-green-500 shadow-lg shadow-green-100/50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Image */}
            <div className="relative h-36 bg-gray-100 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={opt.imageUrl}
                alt={opt.label}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* Selected tint */}
              {active && <div className="absolute inset-0 bg-green-500/10 pointer-events-none" />}
              {/* Checkmark badge */}
              <div
                className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                  active
                    ? 'bg-green-500 border-green-500 shadow-md'
                    : 'bg-white/80 border-gray-300'
                }`}
              >
                <Check
                  className={`w-3.5 h-3.5 stroke-[3] ${active ? 'text-white' : 'text-gray-400'}`}
                />
              </div>
            </div>

            {/* Label */}
            <div className={`px-3 py-2.5 transition-colors ${active ? 'bg-green-50' : 'bg-white'}`}>
              <p className={`text-sm font-semibold leading-snug ${active ? 'text-green-800' : 'text-gray-800'}`}>
                {opt.label}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
