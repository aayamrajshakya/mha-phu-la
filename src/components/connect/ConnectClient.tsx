'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getMoodStyle } from '@/lib/moods'
import { Search, UserPlus, Check, Clock, X, MapPin } from 'lucide-react'

function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

type ProfileSnippet = Pick<User, 'id' | 'name' | 'avatar_url' | 'mood' | 'bio' | 'age'>

interface RawConnection {
  id: string
  requester_id: string
  receiver_id: string
  status: 'pending' | 'accepted'
  requester: ProfileSnippet
  receiver: ProfileSnippet
}

type NearbyUser = User & { distanceMi: number }

interface Props {
  currentUser: User
  initialConnections: RawConnection[]
}

export default function ConnectClient({ currentUser, initialConnections }: Props) {
  const [connections, setConnections] = useState(initialConnections)
  const [emailQuery, setEmailQuery] = useState('')
  const [emailResult, setEmailResult] = useState<User | null>(null)
  const [emailSearching, setEmailSearching] = useState(false)
  const [emailNotFound, setEmailNotFound] = useState(false)
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([])
  const [nearbyLoaded, setNearbyLoaded] = useState(false)
  const [radius, setRadius] = useState(5)
  const supabase = createClient()

  function getStatus(userId: string): 'none' | 'pending_sent' | 'pending_received' | 'accepted' {
    const conn = connections.find(
      c =>
        (c.requester_id === currentUser.id && c.receiver_id === userId) ||
        (c.receiver_id === currentUser.id && c.requester_id === userId)
    )
    if (!conn) return 'none'
    if (conn.status === 'accepted') return 'accepted'
    return conn.requester_id === currentUser.id ? 'pending_sent' : 'pending_received'
  }

  function getConnId(userId: string) {
    return connections.find(
      c =>
        (c.requester_id === currentUser.id && c.receiver_id === userId) ||
        (c.receiver_id === currentUser.id && c.requester_id === userId)
    )?.id
  }

  async function searchByEmail() {
    if (!emailQuery.trim()) return
    setEmailSearching(true)
    setEmailResult(null)
    setEmailNotFound(false)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', emailQuery.trim().toLowerCase())
      .neq('id', currentUser.id)
      .single()
    setEmailSearching(false)
    if (data) setEmailResult(data)
    else setEmailNotFound(true)
  }

  async function loadNearby() {
    if (!currentUser.lat || !currentUser.lng) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUser.id)
      .not('lat', 'is', null)
      .not('lng', 'is', null)
    if (!data) return
    const filtered = data
      .map(u => ({ ...u, distanceMi: distanceMiles(currentUser.lat!, currentUser.lng!, u.lat!, u.lng!) }))
      .filter(u => u.distanceMi <= radius)
      .sort((a, b) => a.distanceMi - b.distanceMi)
    setNearbyUsers(filtered)
    setNearbyLoaded(true)
  }

  async function sendRequest(userId: string) {
    const { data } = await supabase
      .from('connections')
      .insert({ requester_id: currentUser.id, receiver_id: userId })
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(id, name, avatar_url, mood, bio, age),
        receiver:profiles!connections_receiver_id_fkey(id, name, avatar_url, mood, bio, age)
      `)
      .single()
    if (data) setConnections(prev => [...prev, data])
  }

  async function acceptRequest(connId: string) {
    await supabase.from('connections').update({ status: 'accepted' }).eq('id', connId)
    setConnections(prev => prev.map(c => c.id === connId ? { ...c, status: 'accepted' as const } : c))
  }

  async function declineRequest(connId: string) {
    await supabase.from('connections').delete().eq('id', connId)
    setConnections(prev => prev.filter(c => c.id !== connId))
  }

  const incomingRequests = connections.filter(
    c => c.receiver_id === currentUser.id && c.status === 'pending'
  )

  function ActionButton({ userId }: { userId: string }) {
    const status = getStatus(userId)
    const connId = getConnId(userId)
    if (status === 'accepted') {
      return (
        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
          <Check className="w-3.5 h-3.5" /> Friends
        </span>
      )
    }
    if (status === 'pending_sent') {
      return (
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3.5 h-3.5" /> Pending
        </span>
      )
    }
    if (status === 'pending_received') {
      return (
        <div className="flex gap-1.5">
          <Button
            size="sm"
            className="h-7 text-xs bg-yellow-400 hover:bg-yellow-500 text-white px-3"
            onClick={() => acceptRequest(connId!)}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => declineRequest(connId!)}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )
    }
    return (
      <Button
        size="sm"
        className="h-7 text-xs bg-yellow-400 hover:bg-yellow-500 text-white px-3"
        onClick={() => sendRequest(userId)}
      >
        <UserPlus className="w-3.5 h-3.5 mr-1" /> Add
      </Button>
    )
  }

  function UserCard({ user, distanceMi }: { user: ProfileSnippet | User; distanceMi?: number }) {
    const mood = user.mood ? getMoodStyle(user.mood) : null
    return (
      <div className="flex items-start gap-3 px-4 py-3 bg-white border-b border-gray-50">
        <Avatar className="w-11 h-11 flex-shrink-0">
          <AvatarImage src={user.avatar_url ?? ''} />
          <AvatarFallback className="bg-yellow-100 text-yellow-500 font-medium text-sm">
            {user.name?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900">{user.name}</span>
            {user.age != null && (
              <span className="text-xs text-gray-400">{user.age}</span>
            )}
            {mood && (
              <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${mood.color} border-0`}>
                {mood.emoji} {mood.label}
              </Badge>
            )}
          </div>
          {user.bio && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{user.bio}</p>
          )}
          {distanceMi != null && (
            <span className="flex items-center gap-0.5 text-[11px] text-gray-400 mt-0.5">
              <MapPin className="w-3 h-3" />
              {distanceMi < 1 ? '< 1 mi away' : `${distanceMi.toFixed(1)} mi away`}
            </span>
          )}
        </div>
        <div className="flex-shrink-0 mt-0.5">
          <ActionButton userId={user.id} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 z-10">
        <h1 className="text-xl font-bold text-gray-900">Connect</h1>
      </div>

      <Tabs defaultValue="find" className="flex-1">
        <TabsList className="w-full rounded-none border-b border-gray-100 bg-white h-10 px-0">
          <TabsTrigger value="find" className="flex-1 text-xs rounded-none">Find Friend</TabsTrigger>
          <TabsTrigger value="nearby" className="flex-1 text-xs rounded-none">Nearby</TabsTrigger>
          <TabsTrigger value="requests" className="flex-1 text-xs rounded-none">
            Requests
            {incomingRequests.length > 0 && (
              <span className="ml-1.5 bg-yellow-400 text-white text-[10px] rounded-full w-4 h-4 inline-flex items-center justify-center leading-none">
                {incomingRequests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Find by email */}
        <TabsContent value="find" className="mt-0">
          <div className="px-4 py-4 flex gap-2 border-b border-gray-50">
            <Input
              placeholder="Search by email address"
              value={emailQuery}
              onChange={e => { setEmailQuery(e.target.value); setEmailNotFound(false) }}
              onKeyDown={e => e.key === 'Enter' && searchByEmail()}
              className="text-sm"
            />
            <Button
              onClick={searchByEmail}
              disabled={emailSearching}
              className="bg-yellow-400 hover:bg-yellow-500 text-white flex-shrink-0"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
          {emailNotFound && (
            <p className="text-center text-sm text-gray-400 py-10">No user found with that email.</p>
          )}
          {emailResult && <UserCard user={emailResult} />}
        </TabsContent>

        {/* Nearby */}
        <TabsContent value="nearby" className="mt-0">
          {!currentUser.lat || !currentUser.lng ? (
            <div className="text-center py-14 px-6">
              <p className="text-3xl mb-2">📍</p>
              <p className="font-medium text-gray-700 text-sm">Location not set</p>
              <p className="text-xs text-gray-400 mt-1">
                Update your location in your profile to find people nearby.
              </p>
            </div>
          ) : (
            <>
              <div className="px-4 py-4 border-b border-gray-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Search radius</span>
                  <span className="text-sm font-semibold text-yellow-500">{radius} mi</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={1}
                  value={radius}
                  onChange={e => { setRadius(Number(e.target.value)); setNearbyLoaded(false) }}
                  className="w-full accent-yellow-400"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5 mb-3">
                  <span>1 mi</span>
                  <span>50 mi</span>
                </div>
                <Button
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-white text-sm"
                  onClick={loadNearby}
                >
                  Search
                </Button>
              </div>
              {nearbyLoaded && nearbyUsers.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-10">
                  No one within {radius} miles.
                </p>
              )}
              {nearbyUsers.map(u => (
                <UserCard key={u.id} user={u} distanceMi={u.distanceMi} />
              ))}
            </>
          )}
        </TabsContent>

        {/* Incoming requests */}
        <TabsContent value="requests" className="mt-0">
          {incomingRequests.length === 0 ? (
            <div className="text-center py-14">
              <p className="text-3xl mb-2">👋</p>
              <p className="text-sm text-gray-400">No pending requests</p>
            </div>
          ) : (
            incomingRequests.map(conn => (
              <UserCard key={conn.id} user={conn.requester} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
