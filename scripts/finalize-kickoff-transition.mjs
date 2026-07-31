import { readFileSync, writeFileSync } from 'node:fs'

const file = new URL('../src/components/MatchView.tsx', import.meta.url)
let source = readFileSync(file, 'utf8')

const openingBefore = `      setPresentationPhase('live')
      setMessage('Kick-off')
      audio.setSnapshot('normal-match', 0.28)
      audio.emit('kickoff', { scoreHome: score.home, scoreAway: score.away, matchMinute: 0 })
      setRunning(true)`

const openingAfter = `      setPresentationPhase('live')
      setMessage('Kick-off')
      setRunning(true)
      window.setTimeout(() => {
        try {
          audio.setSnapshot('normal-match', 0.28)
          audio.emit('kickoff', { scoreHome: score.home, scoreAway: score.away, matchMinute: 0 })
        } catch (error) {
          console.error('[kickoff-audio] Non-fatal audio failure', error)
        }
      }, 0)`

const resumeBefore = `    setPresentationPhase('live')
    setMessage(score.time > 0 ? 'Match resumed' : 'Kick-off')
    if (score.time === 0) audio.emit('kickoff', { scoreHome: score.home, scoreAway: score.away, matchMinute: 0 })
    audio.setSnapshot('normal-match', 0.3)
    setRunning(true)`

const resumeAfter = `    setPresentationPhase('live')
    setMessage(score.time > 0 ? 'Match resumed' : 'Kick-off')
    setRunning(true)
    window.setTimeout(() => {
      try {
        if (score.time === 0) audio.emit('kickoff', { scoreHome: score.home, scoreAway: score.away, matchMinute: 0 })
        audio.setSnapshot('normal-match', 0.3)
      } catch (error) {
        console.error('[match-resume-audio] Non-fatal audio failure', error)
      }
    }, 0)`

const secondHalfBefore = `      setPresentationPhase('live')
      setMessage('Second half')
      audio.emit('second-half', { scoreHome: score.home, scoreAway: score.away, matchMinute: 45 })
      audio.setSnapshot('normal-match', 0.35)
      setRunning(true)
      audio.setCrowd({ intensity: 0.44, tension: 0.36 })`

const secondHalfAfter = `      setPresentationPhase('live')
      setMessage('Second half')
      setRunning(true)
      window.setTimeout(() => {
        try {
          audio.emit('second-half', { scoreHome: score.home, scoreAway: score.away, matchMinute: 45 })
          audio.setSnapshot('normal-match', 0.35)
          audio.setCrowd({ intensity: 0.44, tension: 0.36 })
        } catch (error) {
          console.error('[second-half-audio] Non-fatal audio failure', error)
        }
      }, 0)`

for (const [label, before, after] of [
  ['opening kickoff', openingBefore, openingAfter],
  ['manual kickoff/resume', resumeBefore, resumeAfter],
  ['second-half restart', secondHalfBefore, secondHalfAfter],
]) {
  if (!source.includes(before)) throw new Error(`Unable to locate ${label} transition`)
  source = source.replace(before, after)
}

writeFileSync(file, source)
console.log('Kickoff and restart transitions now enable simulation before non-fatal audio work.')
