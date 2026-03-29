'use client'

import { useState } from 'react'
import { OUTING_TYPES } from '@/lib/rewards'
import { recordActivityDay } from '@/lib/points'
import { PointEvent } from '@/types'
import { LocalOuting } from './RewardsClient'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Copy, Check, Loader2 } from 'lucide-react'

interface Props {
  outing: LocalOuting
  onUpdated: (id: string, updates: Partial<LocalOuting>) => void
  onPointsEarned: (amount: number, reason: PointEvent['reason']) => void
}

export default function OutingCard({ outing, onUpdated, onPointsEarned }: Props) {
  const [localOuting, setLocalOuting] = useState(outing)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [codeOpen, setCodeOpen] = useState(false)
  const [loadingCode, setLoadingCode] = useState(false)
  const [loadingVerify, setLoadingVerify] = useState(false)
  const config = OUTING_TYPES[localOuting.type]

  const codeStillValid = localOuting.checkin_code &&
    localOuting.checkin_code_expires_at &&
    new Date(localOuting.checkin_code_expires_at) > new Date()

  // After completion, checkin_code holds the 8-char reward code
  const raw = localOuting.checkin_code ?? ''
  const isRewardCode = raw.length === 8 && /^[A-Z0-9]+$/.test(raw)
  const rewardCode = isRewardCode ? raw : ''
  const myHalf = rewardCode ? (localOuting.is_creator ? rewardCode.slice(0, 4) : rewardCode.slice(4)) : '????'

  function applyUpdate(updates: Partial<LocalOuting>) {
    setLocalOuting(prev => ({ ...prev, ...updates }))
    onUpdated(localOuting.id, updates)
  }

  async function generateCode() {
    setLoadingCode(true)
    const res = await fetch(`/api/outings/${localOuting.id}/checkin`, { method: 'POST' })
    const json = await res.json()
    setLoadingCode(false)
    if (!res.ok) { setError(json.error ?? 'Failed to generate code'); return }
    applyUpdate({ checkin_code: json.code, checkin_code_expires_at: json.expires_at })
  }

  async function verifyCode() {
    setError('')
    setLoadingVerify(true)
    const res = await fetch(`/api/outings/${localOuting.id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const json = await res.json()
    setLoadingVerify(false)

    if (!res.ok) {
      setError(
        json.error?.includes('expired')
          ? 'Code expired — ask your friend to generate a new one.'
          : json.error?.includes('Invalid')
          ? 'That code doesn\'t match. Try again.'
          : json.error ?? 'Verification failed'
      )
      return
    }

    applyUpdate({ status: 'completed', checkin_code: json.reward_code })
    onPointsEarned(50, 'outing_complete')
    recordActivityDay()
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
          <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">✓ +50 pts</span>
        )}
      </div>

      {localOuting.status === 'completed' ? (
        <>
          <Button
            onClick={() => setCodeOpen(true)}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-xl"
          >
            🎁 View my discount code
          </Button>
          <Dialog open={codeOpen} onOpenChange={setCodeOpen}>
            <DialogContent>
              <DialogTitle className="text-center text-lg">Your discount code</DialogTitle>
              <div className="text-center py-4">
                <p className="text-xs text-gray-400 mb-1">Your half</p>
                <p className="font-mono font-black text-4xl tracking-widest text-gray-900">{myHalf}</p>
                <p className="text-xs text-gray-400 mt-4">
                  Combine with {localOuting.partner?.name ?? 'your friend'}&apos;s half for the full code.
                </p>
                <div className={`mt-4 rounded-xl p-3 text-left ${config.color} border`}>
                  <p className="text-xs font-semibold text-gray-700">{config.partner} — {config.discount}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{config.note}</p>
                </div>
              </div>
              <DialogFooter showCloseButton />
            </DialogContent>
          </Dialog>
        </>
      ) : localOuting.is_creator ? (
        <div className="space-y-2">
          {codeStillValid ? (
            <div className="bg-yellow-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Share with {localOuting.partner?.name}</p>
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
              disabled={loadingCode}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-xl"
            >
              {loadingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : '📲 Generate check-in code'}
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
              disabled={code.length !== 6 || loadingVerify}
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-xl px-4"
            >
              {loadingVerify ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
            </Button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  )
}
