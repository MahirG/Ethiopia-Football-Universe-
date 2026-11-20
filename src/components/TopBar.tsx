import { useEffect, useMemo, useState } from 'react'
import { Bell, ChevronRight, Menu, Search, X } from 'lucide-react'
import type { Language, View } from '../types'
import { clubs } from '../data/clubs'
import { BrandMark } from './BrandMark'

interface Props {
  language: Language
  setLanguage: (language: Language) => void
  setView: (view: View) => void
  openNav: () => void
}

export function TopBar({ language, setLanguage, setView, openNav }: Props) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clubs.slice(0, 5)
    return clubs.filter((club) =>
      [club.name, club.shortName, club.city, club.region, club.amharicName ?? '']
        .some((value) => value.toLowerCase().includes(q)),
    ).slice(0, 8)
  }, [query])

  useEffect(() => {
    if (!searchOpen && !notificationsOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setNotificationsOpen(false)
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [searchOpen, notificationsOpen])

  useEffect(() => {
    const openOnShortcut = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null
      const editing = element?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element?.tagName ?? '')
      if (event.key === '/' && !editing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        setNotificationsOpen(false)
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', openOnShortcut)
    return () => window.removeEventListener('keydown', openOnShortcut)
  }, [])

  const showClub = (name: string) => {
    sessionStorage.setItem('efu-club-search', name)
    window.dispatchEvent(new CustomEvent<string>('efu:club-selected', { detail: name }))
    setSearchOpen(false)
    setView('clubs')
  }

  return (
    <>
      <header className="topbar">
        <button type="button" className="icon-button mobile-only" onClick={openNav} aria-label="Open all sections">
          <Menu size={21} aria-hidden="true" />
        </button>
        <div className="mobile-only golden-mobile-brand"><BrandMark compact /></div>
        <div className="golden-header-label">
          <span>ETHIOPIAN FOOTBALL UNIVERSE</span>
          <strong>THE GOLDEN ERA</strong>
        </div>
        <button type="button" className="search-trigger" onClick={() => { setNotificationsOpen(false); setSearchOpen(true) }} aria-label="Search football clubs">
          <Search size={17} aria-hidden="true" />
          <span>Search clubs, cities and regions</span>
          <kbd>/</kbd>
        </button>
        <div className="topbar-actions">
          <button type="button" className="icon-button golden-mobile-search" aria-label="Search clubs" onClick={() => { setNotificationsOpen(false); setSearchOpen(true) }}>
            <Search size={20} aria-hidden="true" />
          </button>
          <select aria-label="Language" value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
            <option value="en">EN</option>
            <option value="am">አማ</option>
            <option value="om">OM</option>
            <option value="ti">ትግ</option>
          </select>
          <div className="golden-notification-wrap">
            <button type="button" className="icon-button" aria-label="Notification information" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}>
              <Bell size={19} aria-hidden="true" />
            </button>
            {notificationsOpen && (
              <div className="golden-notifications" role="status">
                <strong>No live notifications</strong>
                <p>Updates will appear here when a notification service is connected. No unread count is shown without real data.</p>
                <button type="button" onClick={() => setNotificationsOpen(false)}>Close</button>
              </div>
            )}
          </div>
          <button type="button" className="avatar golden-account" aria-label="Open game settings" title="Game settings" onClick={() => setView('settings')}>EF</button>
        </div>
      </header>
      {searchOpen && (
        <div className="golden-search-layer">
          <button type="button" className="golden-search-scrim" aria-label="Close search" onClick={() => setSearchOpen(false)} />
          <section className="golden-search-dialog" role="dialog" aria-modal="true" aria-label="Club search">
            <div className="golden-search-head">
              <div><small>EXPLORE THE UNIVERSE</small><h2>Find your club</h2></div>
              <button type="button" className="icon-button" aria-label="Close search" onClick={() => setSearchOpen(false)}><X size={19} /></button>
            </div>
            <label className="golden-search-field">
              <Search size={20} aria-hidden="true" />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Club, city or region" aria-label="Search club names, cities and regions" />
            </label>
            <div className="golden-search-results">
              {results.length === 0 ? <p>No clubs match this search. Try a city or region.</p> : results.map((club) => (
                <button type="button" key={club.id} onClick={() => showClub(club.name)}>
                  <span className="golden-search-club-icon">{club.shortName.slice(0, 3)}</span>
                  <span><strong>{club.name}</strong><small>{club.city} · {club.tier}</small></span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
