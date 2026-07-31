import fs from 'node:fs'

const read = (path) => JSON.parse(fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
const events = read('data/audio/audio-events.json')
const clubs = read('data/audio/club-supporter-profiles.json')
const stadiums = read('data/audio/stadium-profiles.json')
const pronunciations = read('data/audio/pronunciation.json')
const licenses = read('data/audio/licensing-register.template.json')
const errors = []

const unique = (records, key, label) => {
  const values = new Set()
  records.forEach((record) => {
    if (!record[key]) errors.push(`${label} missing ${key}`)
    if (values.has(record[key])) errors.push(`${label} duplicate ${key}: ${record[key]}`)
    values.add(record[key])
  })
}
unique(events.events, 'id', 'audio event')
unique(clubs.clubs, 'clubId', 'club profile')
unique(stadiums.stadiums, 'id', 'stadium profile')
unique(pronunciations.entries, 'id', 'pronunciation')
if (events.events.length < 80) errors.push(`expected at least 80 semantic events, found ${events.events.length}`)
if (clubs.clubs.length < 40) errors.push(`expected all supported clubs, found ${clubs.clubs.length}`)
if (stadiums.stadiums.length < 10) errors.push(`expected major stadium profiles, found ${stadiums.stadiums.length}`)
for (const record of licenses.records) {
  if (!['original','licensed','public-domain','commissioned','placeholder'].includes(record.licenseType)) errors.push(`invalid license type: ${record.licenseType}`)
}
if (errors.length) {
  console.error('Audio validation failed:')
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}
console.log(`Audio validation passed: ${events.events.length} events, ${clubs.clubs.length} club profiles, ${stadiums.stadiums.length} stadium profiles, ${pronunciations.entries.length} pronunciation entries.`)
