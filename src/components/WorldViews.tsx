import { useMemo, useState } from 'react'
import {
  Accessibility, Activity, BarChart3, CalendarDays, CheckCircle2, ChevronDown, CircleDollarSign,
  Cloud, Code2, Database, Download, Flag, Gamepad2, Globe2, GraduationCap, Headphones,
  Languages, LockKeyhole, Medal, MessageCircle, Moon, Palette, Play, Radio,
  Save, Search, Server, ShieldCheck, SlidersHorizontal, Sparkles, Sun, Trophy, Upload,
  UserRoundPlus, UsersRound, Volume2, Wifi, Zap,
} from 'lucide-react'
import { clubs, higherLeagueClubs, premierClubs } from '../data/clubs'
import type { Language, Prospect } from '../types'
import { useLocalStorage } from '../hooks/useLocalStorage'

const formationPositions = [
  ['GK', 50, 91], ['LB', 17, 70], ['CB', 39, 74], ['CB', 61, 74], ['RB', 83, 70],
  ['CM', 33, 49], ['CM', 67, 49], ['LW', 18, 25], ['AM', 50, 33], ['RW', 82, 25], ['ST', 50, 10],
]

export function TacticsView() {
  const [formation, setFormation] = useState('4-2-3-1')
  const [mentality, setMentality] = useState('Balanced')
  const [press, setPress] = useState(64)
  const [width, setWidth] = useState(58)
  const [tempo, setTempo] = useState(72)
  const [saved, setSaved] = useState(false)

  return (
    <div className="view-stack">
      <section className="page-title-row"><div><span className="section-kicker">Advanced tactical laboratory</span><h1>Match Plan</h1><p>Shape formation, pressing, width, tempo, player roles and match mentality.</p></div><button className="primary-button" onClick={() => { setSaved(true); window.setTimeout(() => setSaved(false), 1800) }}><Save size={17} />{saved ? 'Plan saved' : 'Save match plan'}</button></section>
      <section className="tactics-layout">
        <div className="tactics-pitch panel">
          <div className="tactic-toolbar"><label>Formation<select value={formation} onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormation(event.target.value)}><option>4-2-3-1</option><option>4-3-3</option><option>3-4-2-1</option><option>4-4-2</option></select></label><span>{formation}</span></div>
          <div className="formation-board">
            <div className="formation-half" /><div className="formation-circle" />
            {formationPositions.map(([role, x, y], index) => <button key={`${role}-${index}`} className={`formation-player ${role === 'ST' ? 'captain' : ''}`} style={{ left: `${x}%`, top: `${y}%` }}><span>{index + 1}</span><strong>{role}</strong></button>)}
          </div>
        </div>
        <aside className="panel tactic-controls">
          <div className="panel-heading"><div><span className="section-kicker">Team instructions</span><h2>Identity</h2></div><SlidersHorizontal size={20} /></div>
          <label>Mentality<select value={mentality} onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setMentality(event.target.value)}><option>Defensive</option><option>Balanced</option><option>Positive</option><option>Attacking</option></select></label>
          {[['Pressing intensity', press, setPress], ['Attacking width', width, setWidth], ['Tempo', tempo, setTempo]].map(([label, value, setter]) => <label className="range-control" key={String(label)}><span>{String(label)} <strong>{String(value)}</strong></span><input type="range" min="0" max="100" value={Number(value)} onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => (setter as (n: number) => void)(Number(event.target.value))} /></label>)}
          <div className="instruction-grid"><button className="active">Counter-press</button><button>Play from back</button><button>Overlap</button><button>High line</button><button>Work into box</button><button>Time wasting</button></div>
          <div className="tactic-summary"><Zap size={18} /><p><strong>{mentality} {formation}</strong> with a {press > 70 ? 'very aggressive' : press > 45 ? 'controlled' : 'conservative'} press and {tempo > 65 ? 'fast' : 'patient'} circulation.</p></div>
        </aside>
      </section>
      <div className="dashboard-grid three"><article className="stat-panel panel"><Activity /><div><span>Expected possession</span><strong>{Math.round(45 + width * .13)}%</strong><small>Against balanced opposition</small></div></article><article className="stat-panel panel"><BarChart3 /><div><span>Chance creation</span><strong>{Math.round((tempo + press) / 2)}</strong><small>Calculated tactical output</small></div></article><article className="stat-panel panel"><ShieldCheck /><div><span>Transition risk</span><strong>{press > 72 ? 'High' : press > 48 ? 'Moderate' : 'Low'}</strong><small>Adjust line and counter-press</small></div></article></div>
    </div>
  )
}

const table = premierClubs.slice(0, 12).map((club, index) => ({ club, p: 14, w: Math.max(3, 10 - Math.floor(index / 2)), d: 2 + (index % 4), l: Math.max(1, index - 4), gd: 18 - index * 2, pts: 33 - index * 2 }))

export function CompetitionsView() {
  const [competition, setCompetition] = useState('Premier League')
  return (
    <div className="view-stack">
      <section className="page-title-row"><div><span className="section-kicker">Domestic and international football</span><h1>Competitions</h1><p>League, cup, national-team, women, youth and custom tournament architecture.</p></div><label className="large-select"><Trophy size={18} /><select value={competition} onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setCompetition(event.target.value)}><option>Premier League</option><option>Ethiopian Cup</option><option>National Team Journey</option><option>Women’s League</option><option>Custom Tournament</option></select><ChevronDown size={16} /></label></section>
      <div className="competition-banner panel"><div><span>2026 / 27 SEASON</span><h2>{competition}</h2><p>Dynamic scheduling · promotion and relegation · awards · disciplinary accumulation</p></div><div className="competition-trophy"><Trophy size={56} /></div><div className="competition-stats"><div><strong>20</strong><span>Clubs</span></div><div><strong>380</strong><span>Matches</span></div><div><strong>38</strong><span>Rounds</span></div></div></div>
      <section className="competition-grid">
        <div className="panel league-table"><div className="panel-heading"><div><span className="section-kicker">Live simulation</span><h2>League table</h2></div><CalendarDays size={20} /></div><div className="table-header"><span>#</span><span>Club</span><span>P</span><span>W</span><span>D</span><span>L</span><span>GD</span><span>PTS</span></div>{table.map((row, index) => <div className="table-row" key={row.club.id}><span>{index + 1}</span><span className="table-club"><i style={{ background: row.club.colors[0] }} />{row.club.name}</span><span>{row.p}</span><span>{row.w}</span><span>{row.d}</span><span>{row.l}</span><span>{row.gd > 0 ? `+${row.gd}` : row.gd}</span><strong>{row.pts}</strong></div>)}</div>
        <aside className="view-stack compact-stack"><div className="panel fixture-card"><div className="panel-heading"><div><span className="section-kicker">Featured fixture</span><h2>Matchday 15</h2></div><Radio size={18} /></div><div className="fixture-teams"><div><span style={{ background: premierClubs[5].colors[0] }}>{premierClubs[5].shortName}</span><strong>{premierClubs[5].name}</strong></div><b>19:00</b><div><span style={{ background: premierClubs[7].colors[0] }}>{premierClubs[7].shortName}</span><strong>{premierClubs[7].name}</strong></div></div><p>Addis Ababa Stadium · Clear · 18°C</p><button className="primary-button"><Play size={16} /> Play fixture</button></div><div className="panel awards-card"><span className="section-kicker">Season leaders</span><div><Medal /><span>Top scorer</span><strong>B. Tesfaye · 11</strong></div><div><Sparkles /><span>Top assists</span><strong>D. Bekele · 8</strong></div><div><ShieldCheck /><span>Clean sheets</span><strong>M. Tadesse · 7</strong></div></div></aside>
      </section>
    </div>
  )
}

const names = ['Nahom Tesfaye', 'Bontu Gemechu', 'Bereket Haile', 'Saron Mekonnen', 'Kalkidan Alemu', 'Robel Desta', 'Lensa Tolera', 'Yared Getachew', 'Mekdes Girma', 'Abel Tadesse']
const regions = ['Addis Ababa', 'Oromia', 'Amhara', 'Sidama', 'Tigray', 'Harari', 'South Ethiopia']
const positions = ['ST', 'CM', 'RW', 'CB', 'GK', 'LB', 'AM']
const traits = ['Quick learner', 'Big-match temperament', 'Creative passer', 'Relentless presser', 'Aerial leader', 'Two-footed', 'Natural captain']

function generateProspect(): Prospect {
  const rating = 48 + Math.floor(Math.random() * 17)
  return { id: crypto.randomUUID(), name: names[Math.floor(Math.random() * names.length)], age: 15 + Math.floor(Math.random() * 4), position: positions[Math.floor(Math.random() * positions.length)], rating, potential: Math.min(94, rating + 14 + Math.floor(Math.random() * 18)), region: regions[Math.floor(Math.random() * regions.length)], trait: traits[Math.floor(Math.random() * traits.length)] }
}

export function AcademyView() {
  const [prospects, setProspects] = useLocalStorage<Prospect[]>('efu-prospects', Array.from({ length: 6 }, generateProspect))
  const [region, setRegion] = useState('All Ethiopia')
  const scout = () => setProspects((items) => [generateProspect(), ...items].slice(0, 12))
  return (
    <div className="view-stack">
      <section className="page-title-row"><div><span className="section-kicker">School-to-first-team pathway</span><h1>Youth Academy</h1><p>Scout regional talent, monitor potential and develop Ethiopia’s next generation.</p></div><button className="primary-button" onClick={scout}><Search size={17} /> Scout new prospect</button></section>
      <section className="academy-summary panel"><div><GraduationCap size={34} /><div><span>ACADEMY NETWORK</span><h2>National youth pathway</h2><p>School competitions · regional trials · welfare · coaching · loans · first-team promotion</p></div></div><label>Scouting region<select value={region} onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setRegion(event.target.value)}><option>All Ethiopia</option>{regions.map((item) => <option key={item}>{item}</option>)}</select></label></section>
      <div className="prospect-grid">{prospects.filter((item) => region === 'All Ethiopia' || item.region === region).map((prospect) => <article className="prospect-card panel" key={prospect.id}><div className="prospect-head"><span>{prospect.position}</span><em>{prospect.age} yrs</em></div><div className="prospect-avatar">{prospect.name.split(' ').map((part) => part[0]).join('')}</div><h3>{prospect.name}</h3><p>{prospect.region}</p><div className="prospect-ratings"><div><span>Current</span><strong>{prospect.rating}</strong></div><div><span>Potential</span><strong>{prospect.potential}</strong></div></div><div className="potential-bar"><i style={{ width: `${prospect.potential}%` }} /></div><small><Sparkles size={13} /> {prospect.trait}</small><button>Open development plan</button></article>)}</div>
    </div>
  )
}

export function CommunityView() {
  const [joined, setJoined] = useState<string[]>([])
  const events = [
    ['Addis 5v5 Nights', 'Addis Ababa', '5v5', 'Today · 19:30'],
    ['Hawassa Lakeside Cup', 'Hawassa', '4v4', 'Saturday · 15:00'],
    ['Oromia Academy Challenge', 'Adama', 'Youth', 'Aug 08 · 10:00'],
    ['Walia Online Open', 'Cross-platform', '1v1', 'Aug 12 · 20:00'],
  ]
  return (
    <div className="view-stack">
      <section className="page-title-row"><div><span className="section-kicker">Local and online football culture</span><h1>Community</h1><p>Find tournaments, form clubs, share highlights and compete through fair-play ranked systems.</p></div><button className="secondary-button"><Upload size={17} /> Share highlight</button></section>
      <section className="community-hero panel"><div><span className="section-kicker">This week</span><h2>Football belongs to everyone.</h2><p>Community pitches, school fields, futsal, online clubs and supporter-created competitions—moderated for safety and respect.</p><button className="primary-button"><UserRoundPlus size={17} /> Create community club</button></div><div className="community-orbit"><span><UsersRound /></span><span><Gamepad2 /></span><span><Trophy /></span><i>12K<br /><small>PLAYERS</small></i></div></section>
      <div className="event-grid">{events.map(([title, city, format, time]) => <article className="event-card panel" key={title}><div className="event-date"><CalendarDays size={18} /><span>{time}</span></div><h3>{title}</h3><p><Globe2 size={15} /> {city}</p><div><span>{format}</span><span>Fair play</span><span>Open entry</span></div><button className={joined.includes(title) ? 'joined' : ''} onClick={() => setJoined((items) => items.includes(title) ? items.filter((item) => item !== title) : [...items, title])}>{joined.includes(title) ? <><CheckCircle2 size={16} /> Joined</> : 'Join event'}</button></article>)}</div>
      <section className="panel moderation-card"><LockKeyhole size={25} /><div><h3>Community safety by design</h3><p>Reporting, blocking, reputation scoring, moderated names and badges, anti-harassment tools, child-safety policies and transparent appeals.</p></div><button className="text-button">Read community rules</button></section>
    </div>
  )
}

export function DatabaseView() {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState('Clubs')
  const filtered = useMemo(() => clubs.filter((club) => `${club.name} ${club.city} ${club.region} ${club.tier}`.toLowerCase().includes(query.toLowerCase())), [query])
  return (
    <div className="view-stack">
      <section className="page-title-row"><div><span className="section-kicker">Data-driven football world</span><h1>World Database</h1><p>Club, player, competition, stadium, localization and live-operations records prepared for a secure CMS.</p></div><button className="secondary-button"><Download size={17} /> Export schema</button></section>
      <div className="dashboard-grid four"><article className="metric-card panel"><ShieldCheck /><span>Club records</span><strong>{clubs.length}</strong><small>{premierClubs.length} Premier · {higherLeagueClubs.length} Higher</small></article><article className="metric-card panel"><UsersRound /><span>Player capacity</span><strong>Unlimited</strong><small>Data import and generated youth</small></article><article className="metric-card panel"><Languages /><span>Localization</span><strong>4 languages</strong><small>Unicode end-to-end</small></article><article className="metric-card panel"><Server /><span>Architecture</span><strong>CMS ready</strong><small>Audit history and rollback</small></article></div>
      <section className="database-layout">
        <aside className="panel database-nav">{['Clubs', 'Players', 'Competitions', 'Stadiums', 'Commentary', 'Localization', 'Moderation', 'Live Ops'].map((item) => <button key={item} className={active === item ? 'active' : ''} onClick={() => setActive(item)}><Database size={16} />{item}<span>›</span></button>)}</aside>
        <div className="panel database-main"><div className="database-toolbar"><div><span className="section-kicker">Registry</span><h2>{active}</h2></div><label className="search-field"><Search size={16} /><input value={query} onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setQuery(event.target.value)} placeholder={`Search ${active.toLowerCase()}`} /></label></div>{active === 'Clubs' ? <div className="data-table"><div className="data-head"><span>Club</span><span>Tier</span><span>Region</span><span>Rating</span><span>Status</span></div>{filtered.slice(0, 18).map((club) => <div className="data-row" key={club.id}><span><i style={{ background: club.colors[0] }} />{club.name}</span><span>{club.tier}</span><span>{club.region}</span><strong>{club.reputation}</strong><em>Active</em></div>)}</div> : <div className="empty-module"><Code2 size={38} /><h3>{active} module is schema-ready</h3><p>The production backend connects this surface to role-based administration, validation, audit logs, approval workflows and rollback.</p><button className="primary-button">Open system specification</button></div>}</div>
      </section>
      <section className="architecture-strip panel">{[['Client', 'React PWA'], ['Game services', 'Server-authoritative'], ['Data', 'PostgreSQL + Redis'], ['Infrastructure', 'Docker + CI/CD'], ['Security', 'RBAC + audit logs']].map(([label, value], index) => <div key={label}><span>{index < 4 ? '→' : '✓'}</span><small>{label}</small><strong>{value}</strong></div>)}</section>
    </div>
  )
}

interface SettingsProps { language: Language; setLanguage: (language: Language) => void; theme: 'dark' | 'light'; setTheme: (theme: 'dark' | 'light') => void; reducedMotion: boolean; setReducedMotion: (value: boolean) => void }

export function SettingsView({ language, setLanguage, theme, setTheme, reducedMotion, setReducedMotion }: SettingsProps) {
  const [volume, setVolume] = useLocalStorage('efu-volume', 72)
  const [graphics, setGraphics] = useLocalStorage('efu-graphics', 'Adaptive')
  const [contrast, setContrast] = useLocalStorage('efu-contrast', false)
  const [assisted, setAssisted] = useLocalStorage('efu-assisted', true)
  return (
    <div className="view-stack">
      <section className="page-title-row"><div><span className="section-kicker">Personalized on every device</span><h1>Settings & Accessibility</h1><p>Language, visuals, controls, audio, performance and inclusive play options.</p></div><span className="autosave-label"><Cloud size={16} /> Auto-saved locally</span></section>
      <section className="settings-grid">
        <div className="panel settings-group"><div className="panel-heading"><div><span className="section-kicker">Interface</span><h2>Language & appearance</h2></div><Palette size={20} /></div><div className="setting-row"><div><Languages /><span><strong>Language</strong><small>Menus, tutorials and match information</small></span></div><select value={language} onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setLanguage(event.target.value as Language)}><option value="en">English</option><option value="am">አማርኛ</option><option value="om">Afaan Oromo</option><option value="ti">ትግርኛ</option></select></div><div className="setting-row"><div>{theme === 'dark' ? <Moon /> : <Sun />}<span><strong>Appearance</strong><small>High-clarity interface theme</small></span></div><button className="switch-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><i className={theme === 'light' ? 'on' : ''} />{theme}</button></div><div className="setting-row"><div><Accessibility /><span><strong>High contrast</strong><small>Strengthen text and surface separation</small></span></div><button className="switch-button" onClick={() => setContrast(!contrast)}><i className={contrast ? 'on' : ''} />{contrast ? 'On' : 'Off'}</button></div></div>
        <div className="panel settings-group"><div className="panel-heading"><div><span className="section-kicker">Performance</span><h2>Graphics & motion</h2></div><Gamepad2 size={20} /></div><div className="setting-row"><div><Zap /><span><strong>Graphics preset</strong><small>Optimized for affordable and mid-range devices</small></span></div><select value={graphics} onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setGraphics(event.target.value)}><option>Low-spec</option><option>Balanced</option><option>Adaptive</option><option>Ultra</option></select></div><div className="setting-row"><div><Activity /><span><strong>Reduced motion</strong><small>Limit non-essential transitions and camera effects</small></span></div><button className="switch-button" onClick={() => setReducedMotion(!reducedMotion)}><i className={reducedMotion ? 'on' : ''} />{reducedMotion ? 'On' : 'Off'}</button></div><div className="setting-row"><div><Wifi /><span><strong>Low-data mode</strong><small>Smaller downloads and reduced network usage</small></span></div><button className="switch-button"><i />Off</button></div></div>
        <div className="panel settings-group"><div className="panel-heading"><div><span className="section-kicker">Audio</span><h2>Sound & commentary</h2></div><Headphones size={20} /></div><label className="volume-setting"><span><Volume2 />Master volume <strong>{volume}%</strong></span><input type="range" min="0" max="100" value={volume} onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setVolume(Number(event.target.value))} /></label><div className="setting-row"><div><MessageCircle /><span><strong>Commentary language</strong><small>Modular contextual commentary engine</small></span></div><select><option>English</option><option>Amharic sample</option><option>Afaan Oromo sample</option></select></div></div>
        <div className="panel settings-group"><div className="panel-heading"><div><span className="section-kicker">Controls</span><h2>Input assistance</h2></div><SlidersHorizontal size={20} /></div><div className="setting-row"><div><Gamepad2 /><span><strong>Passing assistance</strong><small>Assisted, semi-assisted or manual</small></span></div><button className="switch-button" onClick={() => setAssisted(!assisted)}><i className={assisted ? 'on' : ''} />{assisted ? 'Assisted' : 'Manual'}</button></div><div className="setting-row"><div><Accessibility /><span><strong>One-handed mobile</strong><small>Move critical controls to one side</small></span></div><button className="switch-button"><i />Off</button></div></div>
      </section>
      <section className="panel ethics-card"><CircleDollarSign size={26} /><div><h3>Fair-play economy</h3><p>No competitive stat advantages, manipulative loot boxes, paid energy systems or stronger paid players in ranked competition. Monetization is limited to transparent cosmetic and expansion content.</p></div><Flag size={22} /></section>
    </div>
  )
}
