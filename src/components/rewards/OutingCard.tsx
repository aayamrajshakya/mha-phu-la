'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Outing } from '@/types'
import { OUTING_TYPES } from '@/lib/rewards'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import RewardCoupon from './RewardCoupon'
import { Loader2, Copy, Check } from 'lucide-react'

interface Props {
  outing: Outing & { is_creator: boolean }
  onUpdate: () => void
}

export default function OutingCard({ outing, onUpdate }: Props) {
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const supabase = createClient()
  const config = OUTING_TYPES[outing.type]

  const codeStillValid = outing.checkin_code &&
    outing.checkin_code_expires_at &&
    new Date(outing.checkin_code_expires_at) > new Date()

  async function generateCode() {
    setLoading(true)
    const newCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    await supabase.from('outings').update({
      checkin_code: newCode,
      checkin_code_expires_at: expires,
    }).eq('id', outing.id)
    setLoading(false)
    onUpdate()
  }

  async function verifyCode() {
    setLoading(true)
    setError('')
    const { data } = await supabase
      .from('outings')
      .select('checkin_code, checkin_code_expires_at')
      .eq('id', outing.id)
      .single()

    if (!data?.checkin_code || data.checkin_code !== code) {
      setError('Invalid code. Try again.')
      setLoading(false)
      return
    }
    if (new Date(data.checkin_code_expires_at!) < new Date()) {
      setError('Code expired. Ask your friend to generate a new one.')
      setLoading(false)
      return
    }
    await supabase.from('outings').update({
      status: 'completed',
      reward_unlocked_at: new Date().toISOString(),
    }).eq('id', outing.id)
    setLoading(false)
    onUpdate()
  }

  function copyCode() {
    if (outing.checkin_code) {
      navigator.clipboard.writeText(outing.checkin_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={outing.partner?.avatar_url ?? ''} />
          <AvatarFallback className="bg-yellow-100 text-yellow-700 font-medium">
            {outing.partner?.name?.[0] ?? '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{outing.partner?.name ?? 'Unknown'}</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.badgeColor}`}>
            {config.emoji} {config.label}
          </span>
        </div>
        {outing.status === 'completed' && (
          <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">Unlocked!</span>
        )}
      </div>

      {outing.status === 'completed' ? (
        <RewardCoupon type={outing.type} />
      ) : outing.is_creator ? (
        <div className="space-y-2">
          {codeStillValid ? (
            <div className="bg-yellow-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Share this code with {outing.partner?.name}</p>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono font-black text-3xl tracking-widest text-gray-900">
                  {outing.checkin_code}
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
              disabled={loading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-xl"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '📲 Generate check-in code'}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Enter the check-in code from {outing.partner?.name}</p>
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
              disabled={loading || code.length !== 6}
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-xl px-4"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
            </Button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  )
}
