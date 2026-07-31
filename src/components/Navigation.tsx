import {
  BookOpen, CircleUserRound, ClipboardList, Database, Gamepad2, Globe2, GraduationCap,
  Home, LayoutGrid, Settings, Shield, Swords, Trophy, UsersRound, X,
} from 'lucide-react'
import type { Language, View } from '../types'
import { labels } from '../data/content'
import { BrandMark } from './BrandMark'

const items: { id: View; icon: typeof Home; label: string }[] = [
  { id: 'home', icon: Home, label: 'home' },
  { id: 'match', icon: Gamepad2, label: 'match' },
  { id: 'online', icon: Globe2, label: 'online' },
  { id: 'clubs', icon: Shield, label: 'clubs' },
  { id: 'career', icon: CircleUserRound, label: 'career' },
  { id: 'tactics', icon: ClipboardList, label: 'tactics' },
  { id: 'competitions', icon: Trophy, label: 'competitions' },
  { id: 'academy', icon: GraduationCap, label: 'academy' },
  { id: 'community', icon: UsersRound, label: 'community' },
  { id: 'database', icon: Database, label: 'database' },
  { id: 'settings', icon: Settings, label: 'settings' },
]

interface Props {
  view: View
  setView: (view: View) => void
  language: Language
  open: boolean
  close: () => void
}

export function Navigation({ view, setView, language, open, close }: Props) {
  const t = labels[language]
  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`}>
      <div className="sidebar-head">
        <BrandMark />
        <button className="icon-button mobile-only" onClick={close} aria-label="Close navigation"><X size={20} /></button>
      </div>
      <nav className="nav-list" aria-label="Primary navigation">
        {items.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`nav-item ${view === id ? 'active' : ''}`}
            onClick={() => { setView(id); close() }}
          >
            <Icon size={18} strokeWidth={1.8} />
            <span>{t[label]}</span>
            {(id === 'match' || id === 'online') && <span className="live-dot" title={id === 'match' ? 'Playable' : 'Connected platform'} />}
          </button>
        ))}
      </nav>
      <div className="sidebar-card">
        <div className="sidebar-card-icon"><Swords size={18} /></div>
        <strong>Walia Season 01</strong>
        <span>Build your legacy</span>
        <div className="progress"><i style={{ width: '36%' }} /></div>
      </div>
      <div className="sidebar-foot">
        <BookOpen size={15} />
        <span>Connected platform v1.9</span>
        <LayoutGrid size={15} />
      </div>
    </aside>
  )
}
