import { faker } from '@faker-js/faker'

export type EventCategory =
  | 'Counseling'
  | 'Support Group'
  | 'Meditation'
  | 'Yoga & Wellness'
  | 'Art Therapy'
  | 'Walking Group'
  | 'Coffee Chat'
  | 'Journaling Workshop'
  | 'Recovery Circle'
  | 'Social Anxiety Meetup'
  | 'Grief Support'
  | 'Mindfulness'
  | 'Crisis Support'
  | 'Anxiety Workshop'

export type GroupSize = 'small' | 'large'
export type Vibe = 'active' | 'quiet'
export type EventFormat = 'virtual' | 'offline'
export type DayType = 'weekday' | 'weekend'

export interface MHEvent {
  id: string
  title: string
  category: EventCategory
  description: string
  date: string      // ISO string
  time: string      // e.g. "3:00 PM"
  location: string
  lat: number
  lng: number
  host: string
  capacity: number
  spotsLeft: number
  tags: string[]    // for LLM matching
  durationMin: number
  // Derived enrichment fields for recommendation scoring
  groupSize: GroupSize    // capacity <= 15 → small, > 15 → large
  vibe: Vibe             // Walking/Yoga/Sports categories → active, else → quiet
  format: EventFormat    // location includes Zoom/Online → virtual
  dayType: DayType       // derived from event date
}

const EVENT_TEMPLATES: {
  category: EventCategory
  titles: string[]
  tags: string[]
}[] = [
  {
    category: 'Counseling',
    titles: [
      'Drop-In Counseling Hour',
      'One-on-One Wellbeing Check-In',
      'Free Counseling Walk-In',
      'Student Counseling Session',
    ],
    tags: ['therapy', 'counseling', 'mental health', 'professional support'],
  },
  {
    category: 'Support Group',
    titles: [
      'Depression Peer Support Circle',
      'Anxiety Support Group',
      'General Mental Health Support Group',
      'Weekly Wellness Check-In Group',
    ],
    tags: ['community', 'peer support', 'depression', 'anxiety', 'group'],
  },
  {
    category: 'Meditation',
    titles: [
      'Guided Meditation for Beginners',
      'Morning Calm Meditation',
      'Stress-Relief Meditation Session',
      'Body Scan & Breathing Meditation',
    ],
    tags: ['meditation', 'mindfulness', 'stress relief', 'calm', 'breathing'],
  },
  {
    category: 'Yoga & Wellness',
    titles: [
      'Gentle Yoga for Anxiety',
      'Yoga & Mental Clarity Flow',
      'Restorative Yoga Session',
      'Yoga for Stress & Burnout',
    ],
    tags: ['yoga', 'wellness', 'physical health', 'anxiety', 'relaxation'],
  },
  {
    category: 'Art Therapy',
    titles: [
      'Expressive Art Therapy Workshop',
      'Paint Your Feelings Session',
      'Creative Journaling & Art',
      'Collage & Emotional Expression',
    ],
    tags: ['art', 'creativity', 'therapy', 'expression', 'healing'],
  },
  {
    category: 'Walking Group',
    titles: [
      'Mindful Morning Walk',
      'Nature Walk for Mental Clarity',
      'Walk & Talk Support Group',
      'Sunset Wellness Walk',
    ],
    tags: ['outdoors', 'exercise', 'social', 'nature', 'walking'],
  },
  {
    category: 'Coffee Chat',
    titles: [
      'Mental Health Coffee Meetup',
      'Casual Wellness Coffee Chat',
      'Open Talk Over Coffee',
      'Friendly Faces Coffee Circle',
    ],
    tags: ['social', 'connection', 'casual', 'friendship', 'community'],
  },
  {
    category: 'Journaling Workshop',
    titles: [
      'Guided Journaling for Mental Health',
      'Write to Heal: Journaling Workshop',
      'Reflective Writing Session',
      'Gratitude Journaling Circle',
    ],
    tags: ['journaling', 'writing', 'reflection', 'gratitude', 'self-care'],
  },
  {
    category: 'Recovery Circle',
    titles: [
      'Addiction Recovery Support Circle',
      'Healing Together: Recovery Group',
      'Sobriety & Wellness Meetup',
      'Recovery & Resilience Circle',
    ],
    tags: ['recovery', 'addiction', 'sobriety', 'resilience', 'support'],
  },
  {
    category: 'Social Anxiety Meetup',
    titles: [
      'Social Anxiety Friendly Hangout',
      'Low-Pressure Social Skills Meetup',
      'Comfort Zone Expansion Group',
      'Shy & Thriving Meetup',
    ],
    tags: ['social anxiety', 'shyness', 'social skills', 'low pressure', 'community'],
  },
  {
    category: 'Grief Support',
    titles: [
      'Grief & Loss Support Group',
      'Healing Hearts: Grief Circle',
      'Processing Loss Together',
      'Compassionate Grief Support',
    ],
    tags: ['grief', 'loss', 'bereavement', 'healing', 'support'],
  },
  {
    category: 'Mindfulness',
    titles: [
      'Mindfulness-Based Stress Reduction',
      'Present Moment Awareness Workshop',
      'Daily Mindfulness Practice Group',
      'Mindful Living Session',
    ],
    tags: ['mindfulness', 'stress', 'awareness', 'present moment', 'MBSR'],
  },
  {
    category: 'Anxiety Workshop',
    titles: [
      'Managing Anxiety: Tools & Techniques',
      'CBT Skills for Anxiety Workshop',
      'Understanding & Taming Anxiety',
      'Anxiety Relief Toolkit Session',
    ],
    tags: ['anxiety', 'CBT', 'coping skills', 'tools', 'workshop'],
  },
]

const FIRST_NAMES = ['Rupesh', 'Sanij', 'Rajesh', 'Sushant', 'Suyesh', 'Tanmay', 'Raunak', 'Ashmit', 'Ashim', 'Sachin']
const FAMILY_NAMES = ['Tamrakar', 'Shrestha', 'Adhikari', 'Udas', 'Gurung', 'Shah', 'Ranjit', 'Paudel', 'Khanal']

// Boston, MA center: 42.3588, -71.0578
// Each entry: [neighborhood label, lat, lng]
const BOSTON_LOCATIONS: { label: string; lat: number; lng: number }[] = [
  { label: 'Back Bay Community Center',           lat: 42.3503, lng: -71.0810 },
  { label: 'South End Wellness Hub',              lat: 42.3398, lng: -71.0720 },
  { label: 'Jamaica Plain Library',               lat: 42.3098, lng: -71.1139 },
  { label: 'Fenway Park Pavilion',                lat: 42.3467, lng: -71.0972 },
  { label: 'Downtown Boston Community Hall',      lat: 42.3601, lng: -71.0589 },
  { label: 'Charlestown Neighborhood Center',     lat: 42.3782, lng: -71.0602 },
  { label: 'Allston-Brighton Wellness Room',      lat: 42.3534, lng: -71.1337 },
  { label: 'Roxbury Community College',           lat: 42.3312, lng: -71.0897 },
  { label: 'East Boston Mental Health Clinic',    lat: 42.3748, lng: -71.0388 },
  { label: 'Dorchester Community Garden',         lat: 42.3034, lng: -71.0662 },
  { label: 'Beacon Hill Meeting Room',            lat: 42.3588, lng: -71.0674 },
  { label: 'North End Cultural Center',           lat: 42.3647, lng: -71.0542 },
  { label: 'Somerville Online – Zoom',            lat: 42.3876, lng: -71.0995 },
  { label: 'Cambridge Wellness Studio',           lat: 42.3736, lng: -71.1097 },
  { label: 'Hyde Park Recreation Center',         lat: 42.2554, lng: -71.1245 },
]

const TIMES = [
  '8:00 AM', '9:30 AM', '10:00 AM', '11:00 AM',
  '12:30 PM', '2:00 PM', '3:30 PM', '5:00 PM',
  '6:00 PM', '7:00 PM', '7:30 PM',
]

const DURATIONS = [30, 45, 60, 75, 90, 120]

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateEvents(count = 20, seed = 42): MHEvent[] {
  faker.seed(seed)

  return Array.from({ length: count }, (_, i) => {
    const template = randomItem(EVENT_TEMPLATES)
    const title = randomItem(template.titles)
    const capacity = faker.number.int({ min: 8, max: 40 })
    const spotsLeft = faker.number.int({ min: 0, max: capacity })

    // Spread events across the next 14 days
    const daysAhead = faker.number.int({ min: 0, max: 13 })
    const eventDate = new Date()
    eventDate.setDate(eventDate.getDate() + daysAhead)

    const venue = randomItem(BOSTON_LOCATIONS)
    const isVirtual = venue.label.toLowerCase().includes('zoom') || venue.label.toLowerCase().includes('online')
    const isActive = (['Walking Group', 'Yoga & Wellness'] as EventCategory[]).includes(template.category)
    const dow = eventDate.getDay() // 0=Sun, 6=Sat

    return {
      id: `evt-${i}-${faker.string.alphanumeric(6)}`,
      title,
      category: template.category,
      description: faker.lorem.sentences({ min: 2, max: 3 }),
      date: eventDate.toISOString(),
      time: randomItem(TIMES),
      location: venue.label,
      lat: venue.lat,
      lng: venue.lng,
      host: `${randomItem(FIRST_NAMES)} ${randomItem(FAMILY_NAMES)}`,
      capacity,
      spotsLeft,
      tags: template.tags,
      durationMin: randomItem(DURATIONS),
      groupSize: capacity <= 15 ? 'small' : 'large',
      vibe: isActive ? 'active' : 'quiet',
      format: isVirtual ? 'virtual' : 'offline',
      dayType: dow === 0 || dow === 6 ? 'weekend' : 'weekday',
    }
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}
