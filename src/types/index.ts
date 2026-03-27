export interface User {
  id: string
  email: string
  name: string
  age: number | null
  bio: string | null
  avatar_url: string | null
  address: string | null
  lat: number | null
  lng: number | null
  mood: string | null
  created_at: string
}

export interface Post {
  id: string
  user_id: string
  content: string
  image_url: string | null
  mood_tag: string | null
  created_at: string
  user: Pick<User, 'id' | 'name' | 'avatar_url'>
  likes_count: number
  comments_count: number
  is_liked?: boolean
  is_suggested?: boolean
  distance_km?: number
}

export interface Connection {
  id: string
  requester_id: string
  receiver_id: string
  status: 'pending' | 'accepted'
  created_at: string
  user: Pick<User, 'id' | 'name' | 'avatar_url' | 'mood'>
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
}

export interface Outing {
  id: string
  creator_id: string
  partner_id: string
  type: 'coffee' | 'movies' | 'food' | 'walk'
  status: 'pending' | 'completed' | 'cancelled'
  checkin_code: string | null
  checkin_code_expires_at: string | null
  reward_unlocked_at: string | null
  created_at: string
  partner: Pick<User, 'id' | 'name' | 'avatar_url'>
}

export interface Conversation {
  id: string
  created_at: string
  last_message: string | null
  last_message_at: string | null
  other_user: Pick<User, 'id' | 'name' | 'avatar_url' | 'mood'>
  unread_count: number
}
