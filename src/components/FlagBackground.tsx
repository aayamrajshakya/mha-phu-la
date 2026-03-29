"use client"

import { useEffect, useState } from "react"

const COUNT = 80

export function FlagBackground() {
  const [positions, setPositions] = useState<{ left: number; top: number }[]>([])

  useEffect(() => {
    setPositions(
      Array.from({ length: COUNT }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
      }))
    )
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {positions.map((pos, i) => (
        <img
          key={i}
          src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f1f3-1f1f5.svg"
          alt=""
          style={{
            position: 'absolute',
            left: `${pos.left}%`,
            top: `${pos.top}%`,
            width: '22px',
            height: '22px',
            opacity: 0.18,
          }}
        />
      ))}
    </div>
  )
}
