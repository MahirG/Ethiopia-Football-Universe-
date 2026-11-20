import { CircleEllipsis, Gamepad2, House, Shield, Trophy } from 'lucide-react'
import { labels } from '../data/content'
import type { Language, View } from '../types'

interface MobileDockProps {
  view: View
  language: Language
  setView: (view: View) => void
  openMenu: () => void
}

export function MobileDock({ view, language, setView, openMenu }: MobileDockProps) {
  const t = labels[language]
  const items = [
    { id: 'home', icon: House, label: t.home },
    { id: 'match', icon: Gamepad2, label: t.match },
    { id: 'clubs', icon: Shield, label: t.clubs },
    { id: 'career', icon: Trophy, label: t.career },
  ] as const
  const moreActive = !items.some((item) => item.id === view)

  return (
    <nav className="golden-mobile-dock" aria-label="Mobile primary navigation">
      {items.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          className={view === id ? 'active' : ''}
          aria-current={view === id ? 'page' : undefined}
          aria-label={label}
          title={label}
          onClick={() => setView(id)}
        >
          <Icon size={21} strokeWidth={view === id ? 2.25 : 1.8} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
      <button type="button" className={moreActive ? 'active' : ''} aria-label="More sections" title="More sections" onClick={openMenu}>
        <CircleEllipsis size={21} strokeWidth={1.8} aria-hidden="true" />
        <span>More</span>
      </button>
    </nav>
  )
}
