'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/types'
import { OUTING_TYPES, OutingType } from '@/lib/rewards'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  friends: Pick<User, 'id' | 'name' | 'avatar_url'>[]
  currentUserId: string
  onCreated: () => void
}

export default function PlanOutingDialog({ open, onClose, friends, currentUserId, onCreated }: Props) {
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<OutingType | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function create() {
    if (!selectedFriend || !selectedType) return
    setLoading(true)
    await supabase.from('outings').insert({
      creator_id: currentUserId,
      partner_id: selectedFriend,
      type: selectedType,
    })
    setLoading(false)
    setSelectedFriend(null)
    setSelectedType(null)
    onCreated()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>Plan an outing</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Who are you going with?</p>
            {friends.length === 0 ? (
              <p className="text-sm text-gray-400">No connections yet. Connect with someone first!</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {friends.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFriend(f.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
                      selectedFriend === f.id
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-gray-100 hover:border-yellow-200'
                    }`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={f.avatar_url ?? ''} />
                      <AvatarFallback className="bg-yellow-100 text-yellow-700 text-xs">
                        {f.name?.[0] ?? '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-900">{f.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">What are you doing?</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(OUTING_TYPES) as [OutingType, typeof OUTING_TYPES[OutingType]][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setSelectedType(key)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-colors ${
                    selectedType === key
                      ? 'border-yellow-400 bg-yellow-50'
                      : 'border-gray-100 hover:border-yellow-200'
                  }`}
                >
                  <span className="text-2xl">{val.emoji}</span>
                  <span className="text-xs font-medium text-gray-700">{val.label}</span>
                  <span className="text-[10px] text-gray-400">{val.discount} at {val.partner}</span>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={create}
            disabled={!selectedFriend || !selectedType || loading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-full h-11"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Let's go! 🎉"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
