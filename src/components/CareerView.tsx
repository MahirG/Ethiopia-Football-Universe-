import { useMemo, useState } from 'react'
import { Banknote, CalendarDays, Dumbbell, GraduationCap, HeartPulse, Newspaper, RefreshCw, Search, ShieldCheck, Sparkles, Trophy, UsersRound } from 'lucide-react'
import { premierClubs } from '../data/clubs'
import type { CareerState } from '../types'
import { useLocalStorage } from '../hooks/useLocalStorage'

const initialCareer: CareerState = {
  clubId: premierClubs[0].id,
  season: 1,
  week: 1,
  budget: 18_000_000,
  reputation: 42,
  morale: 78,
  fitness: 82,
  academy: 1,
  facilities: 1,
  points: 0,
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  objective: 'Finish in the top half and promote two academy players.',
  news: ['You have been appointed manager. The board expects a clear football identity.'],
}

export function CareerView() {
  const [career, setCareer] = useLocalStorage<CareerState>('efu-career', initialCareer)
  const [showNew, setShowNew] = useState(career.played === 0)
  const club = useMemo(() => premierClubs.find((item) => item.id === career.clubId) ?? premierClubs[0], [career.clubId])

  const update = (patch: Partial<CareerState>, news: string) => setCareer((current) => ({ ...current, ...patch, news: [news, ...current.news].slice(0, 8) }))

  const train = () => {
    if (career.fitness < 25) return update({}, 'Training was cancelled because the squad needs recovery.')
    update({ fitness: Math.max(0, career.fitness - 9), morale: Math.min(100, career.morale + 4), reputation: Math.min(100, career.reputation + 1) }, 'A high-intensity session improved tactical familiarity and squad morale.')
  }

  const recover = () => update({ fitness: Math.min(100, career.fitness + 13), morale: Math.min(100, career.morale + 1) }, 'The squad completed recovery, nutrition and medical screening.')

  const scout = () => {
    if (career.budget < 250_000) return update({}, 'The scouting trip could not be funded.')
    update({ budget: career.budget - 250_000, academy: Math.min(5, career.academy + (Math.random() > .68 ? 1 : 0)) }, 'Regional scouts identified three prospects for the academy shortlist.')
  }

  const upgrade = () => {
    const cost = career.facilities * 1_500_000
    if (career.budget < cost) return update({}, `Facility upgrade requires ETB ${cost.toLocaleString()}.`)
    update({ budget: career.budget - cost, facilities: Math.min(5, career.facilities + 1), reputation: Math.min(100, career.reputation + 3) }, 'The board approved a training-facility upgrade.')
  }

  const playFixture = () => {
    const strength = (club.attack + club.midfield + club.defense) / 3 + career.morale * .08 + career.fitness * .06 + career.facilities
    const opponent = 65 + Math.random() * 18
    const goalBase = Math.max(.3, 1.2 + (strength - opponent) / 20)
    const goalsFor = Math.max(0, Math.round(goalBase + (Math.random() - .42) * 2.2))
    const goalsAgainst = Math.max(0, Math.round(1.15 + (opponent - strength) / 22 + (Math.random() - .48) * 2.1))
    const win = goalsFor > goalsAgainst
    const draw = goalsFor === goalsAgainst
    const points = win ? 3 : draw ? 1 : 0
    const played = career.played + 1
    const week = career.week + 1
    update({
      week,
      played,
      points: career.points + points,
      wins: career.wins + (win ? 1 : 0),
      draws: career.draws + (draw ? 1 : 0),
      losses: career.losses + (!win && !draw ? 1 : 0),
      fitness: Math.max(20, career.fitness - 14),
      morale: Math.max(25, Math.min(100, career.morale + (win ? 7 : draw ? 1 : -6))),
      budget: career.budget + (win ? 500_000 : draw ? 250_000 : 120_000),
      reputation: Math.max(0, Math.min(100, career.reputation + (win ? 2 : draw ? 0 : -1))),
    }, `${club.shortName} ${goalsFor}–${goalsAgainst} Opponent. ${win ? 'A statement victory.' : draw ? 'Points shared after a balanced contest.' : 'The staff will review the tactical plan.'}`)
  }

  const resetCareer = () => { setCareer(initialCareer); setShowNew(true) }

  return (
    <div className="view-stack">
      <section className="page-title-row">
        <div><span className="section-kicker">Persistent manager simulation</span><h1>Career Hub</h1><p>Lead an Ethiopian club through training, fixtures, scouting, facilities, morale and board expectations.</p></div>
        <button className="secondary-button" onClick={resetCareer}><RefreshCw size={16} /> New career</button>
      </section>

      {showNew && career.played === 0 && (
        <section className="career-onboarding panel">
          <div><span className="section-kicker">Choose your first club</span><h2>Begin the legacy.</h2><p>Your progress is stored automatically on this device and works offline.</p></div>
          <div className="career-club-picker">
            {premierClubs.slice(0, 8).map((item) => <button key={item.id} className={career.clubId === item.id ? 'active' : ''} onClick={() => setCareer((current) => ({ ...current, clubId: item.id }))}><span style={{ background: item.colors[0] }}>{item.shortName}</span>{item.name}</button>)}
          </div>
          <button className="primary-button" onClick={() => setShowNew(false)}>Accept appointment <ShieldCheck size={17} /></button>
        </section>
      )}

      <section className="career-hero panel" style={{ '--club-a': club.colors[0], '--club-b': club.colors[1] } as React.CSSProperties}>
        <div className="career-club-lockup"><div className="career-crest">{club.shortName}</div><div><span>SEASON {career.season} · WEEK {career.week}</span><h2>{club.name}</h2><p>Manager: Mahir Aman · {club.stadium}</p></div></div>
        <div className="career-record"><div><strong>{career.points}</strong><span>Points</span></div><div><strong>{career.wins}-{career.draws}-{career.losses}</strong><span>W-D-L</span></div><div><strong>{career.reputation}</strong><span>Reputation</span></div></div>
      </section>

      <div className="dashboard-grid four">
        <article className="metric-card panel"><Banknote /><span>Club budget</span><strong>ETB {(career.budget / 1_000_000).toFixed(1)}M</strong><small>Transfers, staff and facilities</small></article>
        <article className="metric-card panel"><HeartPulse /><span>Squad fitness</span><strong>{career.fitness}%</strong><div className="progress"><i style={{ width: `${career.fitness}%` }} /></div></article>
        <article className="metric-card panel"><UsersRound /><span>Morale</span><strong>{career.morale}%</strong><div className="progress"><i style={{ width: `${career.morale}%` }} /></div></article>
        <article className="metric-card panel"><GraduationCap /><span>Academy / facilities</span><strong>Lv {career.academy} / {career.facilities}</strong><small>Long-term player development</small></article>
      </div>

      <section className="career-main-grid">
        <div className="panel career-actions-panel">
          <div className="panel-heading"><div><span className="section-kicker">Weekly operations</span><h2>Manager actions</h2></div><CalendarDays size={20} /></div>
          <div className="action-grid">
            <button onClick={train}><Dumbbell /><strong>Train squad</strong><span>+ morale · − fitness</span></button>
            <button onClick={recover}><HeartPulse /><strong>Recovery day</strong><span>Restore match fitness</span></button>
            <button onClick={scout}><Search /><strong>Regional scouting</strong><span>ETB 250K · youth network</span></button>
            <button onClick={upgrade}><Sparkles /><strong>Upgrade facilities</strong><span>Long-term performance</span></button>
          </div>
          <button className="matchday-button" onClick={playFixture}><Trophy size={20} /><div><span>NEXT FIXTURE</span><strong>Play league match</strong></div><b>→</b></button>
        </div>
        <aside className="panel board-panel">
          <div className="panel-heading"><div><span className="section-kicker">Board room</span><h2>Season objective</h2></div><ShieldCheck size={20} /></div>
          <p>{career.objective}</p>
          <div className="objective-progress"><span>League progress</span><strong>{career.played}/38</strong><div className="progress"><i style={{ width: `${Math.min(100, (career.played / 38) * 100)}%` }} /></div></div>
          <div className="board-confidence"><span>Board confidence</span><strong>{Math.max(42, Math.min(96, 58 + career.reputation / 3 + career.points / 2)).toFixed(0)}%</strong></div>
        </aside>
      </section>

      <section className="panel newsroom">
        <div className="panel-heading"><div><span className="section-kicker">Dynamic world</span><h2>Club newsroom</h2></div><Newspaper size={20} /></div>
        {career.news.map((item, index) => <div className="news-row" key={`${item}-${index}`}><span>{index === 0 ? 'NOW' : `W${Math.max(1, career.week - index)}`}</span><p>{item}</p></div>)}
      </section>
    </div>
  )
}
