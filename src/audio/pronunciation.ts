export interface PronunciationEntry {
  id: string
  display: string
  amharic: string
  phonetic: string
  approved: boolean
  category: 'club' | 'stadium' | 'city' | 'competition' | 'player' | 'manager' | 'referee'
}

export const PRONUNCIATIONS: PronunciationEntry[] = [
  { id: 'ethiopia', display: 'Ethiopia', amharic: 'ኢትዮጵያ', phonetic: 'ee-tyoh-pya', approved: true, category: 'competition' },
  { id: 'saint-george', display: 'Saint George', amharic: 'ቅዱስ ጊዮርጊስ', phonetic: 'ki-dus gee-yor-gis', approved: true, category: 'club' },
  { id: 'ethiopian-coffee', display: 'Ethiopian Coffee', amharic: 'ኢትዮጵያ ቡና', phonetic: 'ee-tyoh-pya boo-na', approved: true, category: 'club' },
  { id: 'bahir-dar', display: 'Bahir Dar', amharic: 'ባህር ዳር', phonetic: 'bah-hir dar', approved: true, category: 'city' },
  { id: 'hawassa', display: 'Hawassa', amharic: 'ሀዋሳ', phonetic: 'ha-wa-sa', approved: true, category: 'city' },
  { id: 'addis-ababa', display: 'Addis Ababa', amharic: 'አዲስ አበባ', phonetic: 'ah-dis ah-ba-ba', approved: true, category: 'city' },
  { id: 'premier-league', display: 'Ethiopian Premier League', amharic: 'የኢትዮጵያ ፕሪሚየር ሊግ', phonetic: 'ye-ityopia premier league', approved: true, category: 'competition' },
]

export function pronounce(value: string, language: string) {
  const entry = PRONUNCIATIONS.find((item) => item.display.toLowerCase() === value.toLowerCase() || item.id === value)
  if (!entry) return value
  return language === 'am' ? entry.amharic : entry.display
}
