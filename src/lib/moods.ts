export const MOODS = [
  { label: 'Thriving', emoji: '🌟', color: 'bg-yellow-100 text-yellow-800' },
  { label: 'Good', emoji: '😊', color: 'bg-green-100 text-green-800' },
  { label: 'Okay', emoji: '😐', color: 'bg-blue-100 text-blue-800' },
  { label: 'Struggling', emoji: '😔', color: 'bg-orange-100 text-orange-800' },
  { label: 'Need support', emoji: '💙', color: 'bg-purple-100 text-purple-800' },
]

export function getMoodStyle(mood: string | null) {
  return MOODS.find(m => m.label === mood) ?? MOODS[2]
}
