import { ArrowRight, BadgeCheck, ChevronRight, Gamepad2, Globe2, Play, ShieldCheck, Sparkles, Trophy, UsersRound } from 'lucide-react'
import { featurePillars, labels, modes, roadmap } from '../data/content'
import { premierClubs } from '../data/clubs'
import type { Language, View } from '../types'

interface Props {
  language: Language
  setView: (view: View) => void
}

export function HomeView({ language, setView }: Props) {
  const t = labels[language]
  return (
    <div className="view-stack home-view">
      <section className="hero-panel">
        <div className="hero-noise" />
        <div className="hero-grid" />
        <div className="hero-content">
          <div className="eyebrow"><span className="pulse-dot" /> Playable browser prototype · Season 01</div>
          <h1>{t.headline}</h1>
          <p>{t.subhead}</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => setView('match')}><Play size={17} fill="currentColor" />{t.playNow}</button>
            <button className="secondary-button" onClick={() => setView('clubs')}>{t.explore}<ArrowRight size={17} /></button>
          </div>
          <div className="hero-metrics">
            <div><strong>{premierClubs.length}+</strong><span>Premier clubs</span></div>
            <div><strong>4</strong><span>Local languages</span></div>
            <div><strong>11v11</strong><span>Game architecture</span></div>
          </div>
        </div>
        <div className="hero-visual" aria-label="Stylized football pitch preview">
          <div className="stadium-glow" />
          <div className="hero-pitch">
            <span className="pitch-half" />
            <span className="pitch-circle" />
            <span className="pitch-box left" />
            <span className="pitch-box right" />
            {[12, 25, 38, 51, 64, 77, 90].map((left, index) => <i key={left} className={`player-dot ${index % 2 ? 'gold' : ''}`} style={{ left: `${left}%`, top: `${24 + (index * 13) % 52}%` }} />)}
            <div className="hero-score-card"><span>LIVE PROTOTYPE</span><strong>ETH <b>2</b> — <b>1</b> WORLD</strong><small>78:24 · Addis Ababa</small></div>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="section-kicker">One football universe</span><h2>Every path to glory.</h2></div>
          <button className="text-button" onClick={() => setView('career')}>Open career hub <ChevronRight size={16} /></button>
        </div>
        <div className="mode-grid">
          {modes.map((mode, index) => (
            <button className="mode-card" key={mode.title} onClick={() => setView(index === 0 ? 'match' : index < 4 ? 'career' : 'competitions')}>
              <span className="mode-number">0{index + 1}</span>
              <div className="mode-icon">{[<Gamepad2 />, <Globe2 />, <ShieldCheck />, <Sparkles />, <Trophy />, <UsersRound />][index]}</div>
              <strong>{mode.title}</strong>
              <p>{mode.detail}</p>
              <ArrowRight size={18} />
            </button>
          ))}
        </div>
      </section>

      <section className="section-block split-showcase">
        <div className="national-card">
          <span className="section-kicker">National-team journey</span>
          <h2>From the neighborhood to the Walia shirt.</h2>
          <p>Begin on a community pitch, pass regional trials, earn club minutes and fight for a national-team call-up in a dynamic career world.</p>
          <div className="journey-line">
            {['Community', 'Academy', 'Club', 'Ethiopia'].map((step, index) => <div key={step}><span>{index + 1}</span><strong>{step}</strong></div>)}
          </div>
          <button className="primary-button" onClick={() => setView('career')}>Start your journey <ArrowRight size={17} /></button>
        </div>
        <div className="principles-card">
          <span className="section-kicker">Built differently</span>
          <div className="feature-list">
            {featurePillars.map(([title, detail], index) => (
              <div className="feature-row" key={title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><strong>{title}</strong><p>{detail}</p></div>
                <BadgeCheck size={19} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="section-kicker">Production roadmap</span><h2>Built in stable, playable phases.</h2></div></div>
        <div className="roadmap-grid">
          {roadmap.map((phase) => (
            <article className="roadmap-card" key={phase.phase}>
              <div className="roadmap-head"><span>{phase.phase}</span><em>{phase.status}</em></div>
              <h3>{phase.title}</h3>
              <ul>{phase.items.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
