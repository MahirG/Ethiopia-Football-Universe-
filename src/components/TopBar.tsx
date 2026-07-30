import { Bell, Menu, Search, Wifi } from 'lucide-react'
import type { Language } from '../types'
import { BrandMark } from './BrandMark'

interface Props {
  language: Language
  setLanguage: (language: Language) => void
  openNav: () => void
}

export function TopBar({ language, setLanguage, openNav }: Props) {
  return (
    <header className="topbar">
      <button className="icon-button mobile-only" onClick={openNav} aria-label="Open navigation"><Menu size={21} /></button>
      <div className="mobile-only"><BrandMark compact /></div>
      <button className="search-trigger" onClick={() => document.getElementById('global-search')?.focus()}>
        <Search size={17} /><span>Search clubs, players, competitions…</span><kbd>⌘ K</kbd>
      </button>
      <div className="topbar-actions">
        <span className="online-state"><Wifi size={15} /> Online</span>
        <select aria-label="Language" value={language} onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setLanguage(event.target.value as Language)}>
          <option value="en">EN</option>
          <option value="am">አማ</option>
          <option value="om">OM</option>
          <option value="ti">ትግ</option>
        </select>
        <button className="icon-button" aria-label="Notifications"><Bell size={18} /><span className="notification-badge">3</span></button>
        <div className="avatar">MA</div>
      </div>
      <input id="global-search" className="sr-only" aria-label="Global search" />
    </header>
  )
}
