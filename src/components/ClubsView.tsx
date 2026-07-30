import { useMemo, useState } from 'react'
import { Building2, ChevronRight, Filter, MapPin, Search, Shield, Star, Users } from 'lucide-react'
import { clubs } from '../data/clubs'
import type { Club } from '../types'

export function ClubsView() {
  const [query, setQuery] = useState('')
  const [tier, setTier] = useState('All')
  const [selected, setSelected] = useState<Club>(clubs[0])
  const tiers = ['All', 'Premier League', 'Higher League', 'Historic / Community']
  const filtered = useMemo(() => clubs.filter((club) => {
    const matchesTier = tier === 'All' || club.tier === tier
    const term = query.trim().toLowerCase()
    const matchesQuery = !term || [club.name, club.city, club.region, club.shortName, club.amharicName ?? ''].some((value) => value.toLowerCase().includes(term))
    return matchesTier && matchesQuery
  }), [query, tier])

  return (
    <div className="view-stack">
      <section className="page-title-row">
        <div><span className="section-kicker">License-ready club registry</span><h1>Ethiopian Clubs</h1><p>Search a data-driven football world spanning the Premier League, Higher League and historic community clubs.</p></div>
        <div className="directory-count"><strong>{clubs.length}</strong><span>club records</span></div>
      </section>

      <section className="club-browser">
        <div className="club-list-panel panel">
          <div className="club-tools">
            <label className="search-field"><Search size={17} /><input value={query} onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setQuery(event.target.value)} placeholder="Search club, city or region" /></label>
            <label className="filter-select"><Filter size={16} /><select value={tier} onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setTier(event.target.value)}>{tiers.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <div className="club-result-meta"><span>{filtered.length} results</span><span>Updated dataset architecture</span></div>
          <div className="club-scroll-list">
            {filtered.map((club) => (
              <button className={`club-list-item ${selected.id === club.id ? 'active' : ''}`} key={club.id} onClick={() => setSelected(club)}>
                <span className="club-token" style={{ '--club-a': club.colors[0], '--club-b': club.colors[1] } as React.CSSProperties}>{club.shortName}</span>
                <span><strong>{club.name}</strong><small>{club.city} · {club.tier}</small></span>
                <em>{club.reputation}</em><ChevronRight size={16} />
              </button>
            ))}
          </div>
        </div>

        <div className="club-profile panel">
          <div className="club-profile-hero" style={{ '--club-a': selected.colors[0], '--club-b': selected.colors[1] } as React.CSSProperties}>
            <div className="club-profile-crest">{selected.shortName}</div>
            <div><span>{selected.tier}</span><h2>{selected.name}</h2>{selected.amharicName && <p>{selected.amharicName}</p>}</div>
          </div>
          <div className="club-profile-facts">
            <div><MapPin size={17} /><span>Base</span><strong>{selected.city}, {selected.region}</strong></div>
            <div><Building2 size={17} /><span>Stadium</span><strong>{selected.stadium}</strong></div>
            <div><Users size={17} /><span>Capacity</span><strong>{selected.capacity.toLocaleString()}</strong></div>
            <div><Star size={17} /><span>Reputation</span><strong>{selected.reputation}/100</strong></div>
          </div>
          <div className="club-rating-grid">
            {[['Attack', selected.attack], ['Midfield', selected.midfield], ['Defense', selected.defense], ['Academy', selected.academy], ['Support', selected.support]].map(([label, value]) => (
              <div key={String(label)}><span>{label}</span><strong>{value}</strong><div className="rating-bar"><i style={{ width: `${value}%` }} /></div></div>
            ))}
          </div>
          <div className="club-identity-card"><Shield size={21} /><div><span>Football identity</span><p>{selected.philosophy}</p></div></div>
          <div className="club-legal-note">Official badges, kits, sponsors and player likenesses are replaceable licensed asset layers. The current interface uses original, non-infringing placeholders.</div>
        </div>
      </section>
    </div>
  )
}
