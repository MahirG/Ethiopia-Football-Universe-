import { useEffect, useState } from 'react'
import { Navigation } from './components/Navigation'
import { TopBar } from './components/TopBar'
import { HomeView } from './components/HomeView'
import { MatchView } from './components/MatchView'
import { ClubsView } from './components/ClubsView'
import { CareerView } from './components/CareerView'
import { AcademyView, CommunityView, CompetitionsView, DatabaseView, SettingsView, TacticsView } from './components/WorldViews'
import type { Language, View } from './types'
import { useLocalStorage } from './hooks/useLocalStorage'

export default function App() {
  const [view, setView] = useState<View>('home')
  const [language, setLanguage] = useLocalStorage<Language>('efu-language', 'en')
  const [theme, setTheme] = useLocalStorage<'dark' | 'light'>('efu-theme', 'dark')
  const [reducedMotion, setReducedMotion] = useLocalStorage('efu-reduced-motion', false)
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.classList.toggle('reduced-motion', reducedMotion)
    document.documentElement.lang = language
  }, [language, reducedMotion, theme])

  const renderView = () => {
    switch (view) {
      case 'match': return <MatchView />
      case 'clubs': return <ClubsView />
      case 'career': return <CareerView />
      case 'tactics': return <TacticsView />
      case 'competitions': return <CompetitionsView />
      case 'academy': return <AcademyView />
      case 'community': return <CommunityView />
      case 'database': return <DatabaseView />
      case 'settings': return <SettingsView language={language} setLanguage={setLanguage} theme={theme} setTheme={setTheme} reducedMotion={reducedMotion} setReducedMotion={setReducedMotion} />
      default: return <HomeView language={language} setView={setView} />
    }
  }

  return (
    <div className="app-shell">
      <Navigation view={view} setView={setView} language={language} open={navOpen} close={() => setNavOpen(false)} />
      {navOpen && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setNavOpen(false)} />}
      <div className="app-main">
        <TopBar language={language} setLanguage={setLanguage} openNav={() => setNavOpen(true)} />
        <main className="content-area">{renderView()}</main>
        <footer className="site-footer"><span>© 2026 Ethiopia Football Universe</span><span>Original prototype · License-ready data architecture · No affiliation implied</span></footer>
      </div>
    </div>
  )
}
