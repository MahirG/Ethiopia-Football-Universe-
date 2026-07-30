import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CirclePause, CirclePlay, CloudRain, RotateCcw, Shield, Sun, TimerReset, Trophy, Wind } from 'lucide-react'
import { premierClubs } from '../data/clubs'
import type { MatchRecord } from '../types'
import { useLocalStorage } from '../hooks/useLocalStorage'

interface Vec { x: number; y: number }
interface Player extends Vec { vx: number; vy: number; team: 0 | 1; number: number; controlled?: boolean }
interface Ball extends Vec { vx: number; vy: number; owner: number | null }
interface World { players: Player[]; ball: Ball; homeScore: number; awayScore: number; time: number; message: string }

type Weather = 'clear' | 'rain' | 'wind'

const W = 960
const H = 560
const FIELD = { x: 38, y: 34, w: W - 76, h: H - 68 }

const formations: Vec[] = [
  { x: .1, y: .5 }, { x: .23, y: .16 }, { x: .23, y: .38 }, { x: .23, y: .62 }, { x: .23, y: .84 },
  { x: .45, y: .22 }, { x: .43, y: .5 }, { x: .45, y: .78 }, { x: .65, y: .2 }, { x: .68, y: .5 }, { x: .65, y: .8 },
]

function initialWorld(): World {
  const players: Player[] = []
  for (let team: 0 | 1 = 0; team < 2; team = (team + 1) as 0 | 1) {
    formations.forEach((position, index) => {
      const x = team === 0 ? FIELD.x + position.x * FIELD.w : FIELD.x + (1 - position.x) * FIELD.w
      players.push({ x, y: FIELD.y + position.y * FIELD.h, vx: 0, vy: 0, team, number: index + 1, controlled: team === 0 && index === 6 })
    })
  }
  return { players, ball: { x: W / 2, y: H / 2, vx: 0, vy: 0, owner: null }, homeScore: 0, awayScore: 0, time: 0, message: 'Kick-off' }
}

function drawWorld(ctx: CanvasRenderingContext2D, world: World, homeColor: string, awayColor: string, weather: Weather) {
  ctx.clearRect(0, 0, W, H)
  const gradient = ctx.createLinearGradient(0, 0, W, H)
  gradient.addColorStop(0, '#0b2419')
  gradient.addColorStop(1, '#06130e')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#17633c'
  ctx.fillRect(FIELD.x, FIELD.y, FIELD.w, FIELD.h)
  for (let i = 0; i < 10; i += 1) {
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.026)' : 'rgba(0,0,0,.025)'
    ctx.fillRect(FIELD.x + (FIELD.w / 10) * i, FIELD.y, FIELD.w / 10, FIELD.h)
  }
  ctx.strokeStyle = 'rgba(255,255,255,.65)'
  ctx.lineWidth = 2
  ctx.strokeRect(FIELD.x, FIELD.y, FIELD.w, FIELD.h)
  ctx.beginPath(); ctx.moveTo(W / 2, FIELD.y); ctx.lineTo(W / 2, FIELD.y + FIELD.h); ctx.stroke()
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 70, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fill()
  ctx.strokeRect(FIELD.x, H / 2 - 115, 145, 230)
  ctx.strokeRect(FIELD.x + FIELD.w - 145, H / 2 - 115, 145, 230)
  ctx.strokeRect(FIELD.x - 11, H / 2 - 53, 11, 106)
  ctx.strokeRect(FIELD.x + FIELD.w, H / 2 - 53, 11, 106)

  world.players.forEach((player, index) => {
    const color = player.team === 0 ? homeColor : awayColor
    ctx.beginPath(); ctx.arc(player.x, player.y, player.controlled ? 13 : 11, 0, Math.PI * 2)
    ctx.fillStyle = color; ctx.fill()
    ctx.lineWidth = player.controlled ? 3 : 1.5
    ctx.strokeStyle = player.controlled ? '#f7d44a' : 'rgba(255,255,255,.7)'; ctx.stroke()
    if (player.controlled) {
      ctx.beginPath(); ctx.moveTo(player.x, player.y - 22); ctx.lineTo(player.x - 6, player.y - 31); ctx.lineTo(player.x + 6, player.y - 31); ctx.closePath(); ctx.fillStyle = '#f7d44a'; ctx.fill()
    }
    ctx.font = '700 8px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(String((index % 11) + 1), player.x, player.y + 3)
  })

  ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 7
  ctx.beginPath(); ctx.arc(world.ball.x, world.ball.y, 7, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#18231e'; ctx.lineWidth = 2; ctx.stroke()
  ctx.shadowBlur = 0

  if (weather === 'rain') {
    ctx.strokeStyle = 'rgba(190,220,255,.3)'; ctx.lineWidth = 1
    for (let i = 0; i < 80; i += 1) {
      const x = (i * 97 + world.time * 350) % W
      const y = (i * 53 + world.time * 500) % H
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 8, y + 17); ctx.stroke()
    }
  }
}

export function MatchView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<World>(initialWorld())
  const keysRef = useRef(new Set<string>())
  const animationRef = useRef<number | null>(null)
  const lastRef = useRef(performance.now())
  const [running, setRunning] = useState(false)
  const [homeId, setHomeId] = useState(premierClubs[0].id)
  const [awayId, setAwayId] = useState(premierClubs[5].id)
  const [weather, setWeather] = useState<Weather>('clear')
  const [difficulty, setDifficulty] = useState('Professional')
  const [score, setScore] = useState({ home: 0, away: 0, time: 0, message: 'Ready' })
  const [records, setRecords] = useLocalStorage<MatchRecord[]>('efu-match-history', [])
  const home = useMemo(() => premierClubs.find((item) => item.id === homeId) ?? premierClubs[0], [homeId])
  const away = useMemo(() => premierClubs.find((item) => item.id === awayId) ?? premierClubs[1], [awayId])

  const reset = useCallback(() => {
    worldRef.current = initialWorld()
    setScore({ home: 0, away: 0, time: 0, message: 'Kick-off' })
    setRunning(false)
  }, [])

  const kickBall = useCallback((power: number, targetY?: number) => {
    const world = worldRef.current
    const controlledIndex = world.players.findIndex((player) => player.controlled)
    const player = world.players[controlledIndex]
    const dx = 1
    const dy = targetY === undefined ? 0 : Math.max(-.6, Math.min(.6, (targetY - player.y) / 160))
    const norm = Math.hypot(dx, dy) || 1
    world.ball.owner = null
    world.ball.x = player.x + 18
    world.ball.y = player.y
    world.ball.vx = (dx / norm) * power
    world.ball.vy = (dy / norm) * power
    world.message = power > 480 ? 'Shot!' : 'Pass released'
  }, [])

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      keysRef.current.add(event.key.toLowerCase())
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(event.key.toLowerCase())) event.preventDefault()
      if (event.key === ' ') kickBall(560)
      if (event.key.toLowerCase() === 'e') kickBall(360, H / 2)
      if (event.key.toLowerCase() === 'p') setRunning((value) => !value)
    }
    const up = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [kickBall])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const loop = (now: number) => {
      const dt = Math.min(.032, (now - lastRef.current) / 1000)
      lastRef.current = now
      const world = worldRef.current
      if (running) {
        world.time += dt * 9
        const controlled = world.players.find((player) => player.controlled)!
        const keys = keysRef.current
        let dx = 0; let dy = 0
        if (keys.has('w') || keys.has('arrowup')) dy -= 1
        if (keys.has('s') || keys.has('arrowdown')) dy += 1
        if (keys.has('a') || keys.has('arrowleft')) dx -= 1
        if (keys.has('d') || keys.has('arrowright')) dx += 1
        const length = Math.hypot(dx, dy) || 1
        const speed = keys.has('shift') ? 235 : 175
        controlled.vx += ((dx / length) * speed - controlled.vx) * Math.min(1, dt * 9)
        controlled.vy += ((dy / length) * speed - controlled.vy) * Math.min(1, dt * 9)
        if (!dx) controlled.vx *= .82
        if (!dy) controlled.vy *= .82
        controlled.x = Math.max(FIELD.x + 8, Math.min(FIELD.x + FIELD.w - 8, controlled.x + controlled.vx * dt))
        controlled.y = Math.max(FIELD.y + 8, Math.min(FIELD.y + FIELD.h - 8, controlled.y + controlled.vy * dt))

        world.players.forEach((player) => {
          if (player.controlled) return
          const side = player.team === 0 ? 1 : -1
          const ballDistance = Math.hypot(world.ball.x - player.x, world.ball.y - player.y)
          const chase = ballDistance < (difficulty === 'Legendary' ? 185 : 125)
          const targetX = chase ? world.ball.x : player.x + side * Math.sin(world.time / 7 + player.number) * .5
          const targetY = chase ? world.ball.y : player.y + Math.cos(world.time / 8 + player.number) * .4
          const aiSpeed = difficulty === 'Legendary' ? 86 : difficulty === 'Professional' ? 66 : 52
          if (chase) {
            const ax = targetX - player.x; const ay = targetY - player.y; const al = Math.hypot(ax, ay) || 1
            player.x += (ax / al) * aiSpeed * dt
            player.y += (ay / al) * aiSpeed * dt
          }
          if (ballDistance < 17 && world.ball.owner === null && Math.abs(world.ball.vx) < 160) {
            world.ball.vx = side * (240 + Math.random() * 130)
            world.ball.vy = (H / 2 - world.ball.y) * .45 + (Math.random() - .5) * 110
          }
        })

        if (Math.hypot(world.ball.x - controlled.x, world.ball.y - controlled.y) < 22 && Math.hypot(world.ball.vx, world.ball.vy) < 135) {
          world.ball.owner = world.players.indexOf(controlled)
        }
        if (world.ball.owner !== null) {
          const owner = world.players[world.ball.owner]
          world.ball.x = owner.x + (owner.team === 0 ? 15 : -15)
          world.ball.y = owner.y + 3
          world.ball.vx = owner.vx; world.ball.vy = owner.vy
        } else {
          const friction = weather === 'rain' ? .989 : .978
          world.ball.x += world.ball.vx * dt
          world.ball.y += world.ball.vy * dt
          world.ball.vx *= friction
          world.ball.vy *= friction
          if (weather === 'wind') world.ball.vy += Math.sin(world.time / 3) * 6 * dt
          if (world.ball.y < FIELD.y + 7 || world.ball.y > FIELD.y + FIELD.h - 7) {
            world.ball.y = Math.max(FIELD.y + 7, Math.min(FIELD.y + FIELD.h - 7, world.ball.y)); world.ball.vy *= -.72
          }
        }

        const inGoal = world.ball.y > H / 2 - 53 && world.ball.y < H / 2 + 53
        if (world.ball.x > FIELD.x + FIELD.w + 8 && inGoal) {
          world.homeScore += 1; world.message = `GOAL — ${home.shortName}!`; world.ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, owner: null }
        } else if (world.ball.x < FIELD.x - 8 && inGoal) {
          world.awayScore += 1; world.message = `GOAL — ${away.shortName}!`; world.ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, owner: null }
        } else if (world.ball.x < FIELD.x - 25 || world.ball.x > FIELD.x + FIELD.w + 25) {
          world.ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, owner: null }; world.message = 'Restart from midfield'
        }

        if (world.time >= 90) {
          setRunning(false)
          const record: MatchRecord = { id: crypto.randomUUID(), home: home.name, away: away.name, homeScore: world.homeScore, awayScore: world.awayScore, date: new Date().toISOString() }
          setRecords((items) => [record, ...items].slice(0, 8))
          world.message = 'Full time'
        }
        setScore({ home: world.homeScore, away: world.awayScore, time: world.time, message: world.message })
      }
      drawWorld(ctx, world, home.colors[0], away.colors[0], weather)
      animationRef.current = requestAnimationFrame(loop)
    }
    animationRef.current = requestAnimationFrame(loop)
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current) }
  }, [away, difficulty, home, running, setRecords, weather])

  const moveTouch = (dx: number, dy: number) => {
    const controlled = worldRef.current.players.find((player) => player.controlled)
    if (!controlled) return
    controlled.vx = dx * 190; controlled.vy = dy * 190
  }

  return (
    <div className="view-stack match-view">
      <section className="page-title-row">
        <div><span className="section-kicker">Playable vertical slice</span><h1>Match Center</h1><p>Control the highlighted player. Move with WASD or arrows, sprint with Shift, pass with E and shoot with Space.</p></div>
        <div className="title-actions"><span className="prototype-badge"><span /> REAL-TIME CANVAS ENGINE</span></div>
      </section>

      <section className="match-setup panel">
        <div className="team-selector">
          <span>HOME</span>
          <select value={homeId} onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setHomeId(event.target.value); reset() }}>
            {premierClubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
          </select>
          <div className="mini-crest" style={{ '--club-a': home.colors[0], '--club-b': home.colors[1] } as React.CSSProperties}>{home.shortName}</div>
        </div>
        <div className="match-versus"><small>FRIENDLY</small><strong>VS</strong><span>Addis Ababa · 2,400m</span></div>
        <div className="team-selector away">
          <span>AWAY</span>
          <select value={awayId} onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setAwayId(event.target.value); reset() }}>
            {premierClubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
          </select>
          <div className="mini-crest" style={{ '--club-a': away.colors[0], '--club-b': away.colors[1] } as React.CSSProperties}>{away.shortName}</div>
        </div>
      </section>

      <section className="game-shell">
        <div className="game-hud">
          <div className="hud-club"><span style={{ background: home.colors[0] }} />{home.shortName}</div>
          <strong>{score.home} <em>—</em> {score.away}</strong>
          <div className="hud-club right">{away.shortName}<span style={{ background: away.colors[0] }} /></div>
          <small>{Math.floor(score.time).toString().padStart(2, '0')}:{Math.floor((score.time % 1) * 60).toString().padStart(2, '0')}</small>
          <div className="hud-message">{score.message}</div>
        </div>
        <canvas ref={canvasRef} width={W} height={H} aria-label="Playable top-down football match" />
        <div className="game-controls-overlay">
          <div className="touch-dpad mobile-game-controls">
            <button onPointerDown={() => moveTouch(0, -1)} onPointerUp={() => moveTouch(0, 0)}>▲</button>
            <button onPointerDown={() => moveTouch(-1, 0)} onPointerUp={() => moveTouch(0, 0)}>◀</button>
            <button onPointerDown={() => moveTouch(1, 0)} onPointerUp={() => moveTouch(0, 0)}>▶</button>
            <button onPointerDown={() => moveTouch(0, 1)} onPointerUp={() => moveTouch(0, 0)}>▼</button>
          </div>
          <div className="touch-actions mobile-game-controls"><button onClick={() => kickBall(360, H / 2)}>PASS</button><button onClick={() => kickBall(560)}>SHOOT</button></div>
        </div>
      </section>

      <section className="match-toolbar panel">
        <button className="primary-button" onClick={() => setRunning((value) => !value)}>{running ? <CirclePause size={18} /> : <CirclePlay size={18} />}{running ? 'Pause match' : score.time > 0 ? 'Resume match' : 'Kick off'}</button>
        <button className="secondary-button" onClick={reset}><RotateCcw size={17} /> Reset</button>
        <label>Difficulty<select value={difficulty} onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDifficulty(event.target.value)}><option>Academy</option><option>Professional</option><option>Legendary</option></select></label>
        <div className="weather-picker">
          <button className={weather === 'clear' ? 'active' : ''} onClick={() => setWeather('clear')} title="Clear"><Sun size={17} /></button>
          <button className={weather === 'rain' ? 'active' : ''} onClick={() => setWeather('rain')} title="Rain"><CloudRain size={17} /></button>
          <button className={weather === 'wind' ? 'active' : ''} onClick={() => setWeather('wind')} title="Wind"><Wind size={17} /></button>
        </div>
      </section>

      <div className="dashboard-grid three">
        <article className="stat-panel panel"><TimerReset /><div><span>Match format</span><strong>9× accelerated 90'</strong><small>Responsive prototype simulation</small></div></article>
        <article className="stat-panel panel"><Shield /><div><span>Game model</span><strong>Independent ball</strong><small>Momentum, friction and weather</small></div></article>
        <article className="stat-panel panel"><Trophy /><div><span>Local history</span><strong>{records.length} matches</strong><small>Stored privately on this device</small></div></article>
      </div>

      {records.length > 0 && <section className="panel history-panel"><div className="panel-heading"><h2>Recent results</h2><button className="text-button" onClick={() => setRecords([])}>Clear history</button></div>{records.map((record) => <div className="history-row" key={record.id}><span>{new Date(record.date).toLocaleDateString()}</span><strong>{record.home}</strong><b>{record.homeScore} — {record.awayScore}</b><strong>{record.away}</strong></div>)}</section>}
    </div>
  )
}
