'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { createClient } from '@/lib/supabase/client'
import { RADIUS_KEY, DEFAULT_RADIUS } from '@/components/layout/SideDrawer'

// Fix default marker icons broken by webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const meIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  className: 'hue-rotate-[200deg]', // blue tint for "me"
})

interface NearbyUser {
  id: string
  name: string
  avatar_url: string | null
  lat: number
  lng: number
}

function FlyToMe({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], 13, { animate: true, duration: 1 })
  }, [lat, lng, map])
  return null
}

export default function MapClient({ currentUserId }: { currentUserId: string }) {
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [locationError, setLocationError] = useState(false)
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([])
  const [radius] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_RADIUS
    const stored = localStorage.getItem(RADIUS_KEY)
    return stored ? Number(stored) : DEFAULT_RADIUS
  })
  const supabase = createClient()

  useEffect(() => {
    if (!navigator.geolocation) { setLocationError(true); return }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setPosition([lat, lng])

        const { data } = await supabase
          .from('profiles')
          .select('id, name, avatar_url, lat, lng')
          .neq('id', currentUserId)
          .not('lat', 'is', null)
          .not('lng', 'is', null)

        if (data) {
          const radiusM = radius * 1609.34
          const filtered = data.filter(u => {
            const d = L.latLng(lat, lng).distanceTo(L.latLng(u.lat, u.lng))
            return d <= radiusM
          })
          setNearbyUsers(filtered as NearbyUser[])
        }
      },
      () => setLocationError(true)
    )
  }, [currentUserId, radius, supabase])

  if (locationError) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
        <p className="text-3xl mb-3">📍</p>
        <p className="font-medium text-gray-700">Location access denied</p>
        <p className="text-sm text-gray-400 mt-1">Enable location in your browser to see the map.</p>
      </div>
    )
  }

  if (!position) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <p className="text-sm text-gray-400">Finding your location...</p>
      </div>
    )
  }

  const radiusM = radius * 1609.34

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100 flex items-center justify-between">
        <p className="text-xs text-yellow-700 font-medium">
          {nearbyUsers.length} {nearbyUsers.length === 1 ? 'person' : 'people'} within {radius} mi
        </p>
        <p className="text-[10px] text-yellow-500">Radius from preferences</p>
      </div>
      <MapContainer
        center={position}
        zoom={13}
        className="flex-1 w-full"
        style={{ minHeight: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToMe lat={position[0]} lng={position[1]} />

        {/* Radius circle */}
        <Circle
          center={position}
          radius={radiusM}
          pathOptions={{ color: '#facc15', fillColor: '#fef08a', fillOpacity: 0.15, weight: 1.5 }}
        />

        {/* Me */}
        <Marker position={position} icon={meIcon}>
          <Popup>You are here</Popup>
        </Marker>

        {/* Nearby users */}
        {nearbyUsers.map(u => (
          <Marker key={u.id} position={[u.lat, u.lng]}>
            <Popup>
              <div className="flex items-center gap-2 min-w-[120px]">
                {u.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                )}
                <span className="font-medium text-sm">{u.name}</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
