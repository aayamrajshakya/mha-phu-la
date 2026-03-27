'use client'

import { useState } from 'react'
import { OUTING_TYPES } from '@/lib/rewards'
import { LocalOuting } from './RewardsClient'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Copy, Check } from 'lucide-react'

interface Props {
  outing: LocalOuting
  onUpdated: (id: string, updates: Partial<LocalOuting>) => void
}

export default function OutingCard({ outing, onUpdated }: Props) {
  const [localOuting, setLocalOuting] = useState(outing)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [codeOpen, setCodeOpen] = useState(false)
  const config = OUTING_TYPES[localOuting.type]

  const codeStillValid = localOuting.checkin_code &&
    localOuting.checkin_code_expires_at &&
    new Date(localOuting.checkin_code_expires_at) > new Date()

  const raw = localOuting.checkin_code ?? ''
  const rewardCode = raw.length === 8 && /^[A-Z0-9]+$/.test(raw)
    ? raw
    : localOuting.id.replace(/-/g, '').slice(0, 8).toUpperCase()
  const myHalf = localOuting.is_creator ? rewardCode.slice(0, 4) : rewardCode.slice(4)

  function applyUpdate(updates: Partial<LocalOuting>) {
    setLocalOuting(prev => ({ ...prev, ...updates }))
    onUpdated(localOuting.id, updates)
  }

  function generateCode() {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    applyUpdate({ checkin_code: newCode, checkin_code_expires_at: expires })
  }

  function verifyCode() {
    setError('')
    if (!localOuting.checkin_code || localOuting.checkin_code !== code) {
      setError('Invalid code. Try again.')
      return
    }
    if (localOuting.checkin_code_expires_at && new Date(localOuting.checkin_code_expires_at) < new Date()) {
      setError('Code expired. Ask your friend to generate a new one.')
      return
    }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const newRewardCode = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    applyUpdate({ status: 'completed', checkin_code: newRewardCode })
  }

  function copyCode() {
    if (localOuting.checkin_code) {
      navigator.clipboard.writeText(localOuting.checkin_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={localOuting.partner?.avatar_url ?? ''} />
          <AvatarFallback className="bg-yellow-100 text-yellow-700 font-medium">
            {localOuting.partner?.name?.[0] ?? '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{localOuting.partner?.name ?? 'Unknown'}</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.badgeColor}`}>
            {config.emoji} {config.label}
          </span>
        </div>
        {localOuting.status === 'completed' && (
          <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">Unlocked!</span>
        )}
      </div>

      {localOuting.status === 'completed' ? (
        <>
          <Button
            onClick={() => setCodeOpen(true)}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-xl"
          >
            🎁 View my code
          </Button>
          <Dialog open={codeOpen} onOpenChange={setCodeOpen}>
            <DialogContent>
              <DialogTitle className="text-center text-lg">Your Code</DialogTitle>
              <div className="text-center py-4">
                <p className="text-xs text-gray-400 mb-2">Your half of the discount code</p>
                <p className="font-mono font-black text-4xl tracking-widest text-gray-900">{myHalf}</p>
                <p className="text-xs text-gray-400 mt-4">
                  Ask {localOuting.partner?.name ?? 'your friend'} for their half to get the full code.
                </p>
              </div>
              <DialogFooter showCloseButton />
            </DialogContent>
          </Dialog>
        </>
      ) : localOuting.is_creator ? (
        <div className="space-y-2">
          {codeStillValid ? (
            <div className="bg-yellow-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Share this code with {localOuting.partner?.name}</p>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono font-black text-3xl tracking-widest text-gray-900">
                  {localOuting.checkin_code}
                </span>
                <button onClick={copyCode} className="text-gray-400 hover:text-gray-600">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Expires in ~10 min</p>
            </div>
          ) : (
            <Button
              onClick={generateCode}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-xl"
            >
              📲 Generate check-in code
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Enter the check-in code from {localOuting.partner?.name}</p>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code"
              className="font-mono text-center tracking-widest text-lg h-11 rounded-xl"
              maxLength={6}
            />
            <Button
              onClick={verifyCode}
              disabled={code.length !== 6}
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-xl px-4"
            >
              Verify
            </Button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  )
}
