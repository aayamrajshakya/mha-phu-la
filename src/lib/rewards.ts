export const OUTING_TYPES = {
  coffee: {
    label: 'Coffee',
    emoji: '☕',
    partner: 'Starbucks',
    discount: '20% off',
    code: 'MHAFU-SB20',
    note: 'Valid on any beverage. Show this screen at the counter.',
    color: 'bg-green-50 border-green-200',
    badgeColor: 'bg-green-100 text-green-700',
  },
  movies: {
    label: 'Movies',
    emoji: '🎬',
    partner: 'TGV Cinemas',
    discount: '15% off',
    code: 'MHAFU-TGV15',
    note: 'Valid on standard screenings. Show at ticket counter.',
    color: 'bg-red-50 border-red-200',
    badgeColor: 'bg-red-100 text-red-700',
  },
  food: {
    label: 'Food',
    emoji: '🍜',
    partner: 'Partner Restaurants',
    discount: '10% off',
    code: 'MHAFU-FOOD10',
    note: 'Valid at participating restaurants.',
    color: 'bg-orange-50 border-orange-200',
    badgeColor: 'bg-orange-100 text-orange-700',
  },
  walk: {
    label: 'Walk / Hangout',
    emoji: '🚶',
    partner: 'Wellness Reward',
    discount: 'Free item',
    code: 'MHAFU-WELL',
    note: 'Redeem for a free wellness item at partner stores.',
    color: 'bg-blue-50 border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
} as const

export type OutingType = keyof typeof OUTING_TYPES
