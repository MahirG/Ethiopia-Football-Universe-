import type { Language } from '../types'

export const labels: Record<Language, Record<string, string>> = {
  en: {
    home: 'Universe', match: 'Play Match', clubs: 'Clubs', career: 'Career', tactics: 'Tactics', competitions: 'Competitions', academy: 'Academy', community: 'Community', database: 'World DB', settings: 'Settings',
    playNow: 'Play now', explore: 'Explore clubs', headline: 'The heartbeat of Ethiopian football.', subhead: 'Play, manage, build and represent every level of the Ethiopian game — from community pitches to the national team.',
  },
  am: {
    home: 'ዩኒቨርስ', match: 'ጨዋታ', clubs: 'ክለቦች', career: 'የሙያ ጉዞ', tactics: 'ታክቲክ', competitions: 'ውድድሮች', academy: 'አካዳሚ', community: 'ማህበረሰብ', database: 'የዓለም መረጃ', settings: 'ቅንብሮች',
    playNow: 'አሁን ተጫወት', explore: 'ክለቦችን ይመልከቱ', headline: 'የኢትዮጵያ እግር ኳስ የልብ ምት።', subhead: 'ከማህበረሰብ ሜዳ እስከ ብሔራዊ ቡድን — ተጫወት፣ አስተዳድር እና ክለብህን ገንባ።',
  },
  om: {
    home: 'Yuunivarsii', match: 'Tapha', clubs: 'Kilaabota', career: 'Imala Hojii', tactics: 'Taktiikii', competitions: 'Dorgommii', academy: 'Akkaadaamii', community: 'Hawaasa', database: 'Kuusaa Addunyaa', settings: 'Qindaa’ina',
    playNow: 'Amma taphadhu', explore: 'Kilaabota ilaali', headline: 'Dha’annaa onnee kubbaa miilaa Itoophiyaa.', subhead: 'Dirree hawaasaa irraa hanga garee biyyaalessaatti — taphadhu, bulchi, ijaari fi bakka bu’i.',
  },
  ti: {
    home: 'ዩኒቨርስ', match: 'ጸወታ', clubs: 'ክለባት', career: 'ሞያ', tactics: 'ታክቲክ', competitions: 'ውድድራት', academy: 'ኣካዳሚ', community: 'ማሕበረሰብ', database: 'ዳታቤዝ', settings: 'ቅንብር',
    playNow: 'ሕጂ ተጻወት', explore: 'ክለባት ርአ', headline: 'ትርግታ ልቢ ኩዕሶ እግሪ ኢትዮጵያ።', subhead: 'ካብ ሜዳ ማሕበረሰብ ክሳብ ሃገራዊ ጋንታ — ተጻወት፣ ኣመሓድር፣ ህነጽ።',
  },
}

export const modes = [
  { title: 'Kick-Off', detail: 'Club, national team, women, youth, historic and custom match formats.' },
  { title: 'Road to the National Team', detail: 'Start on a neighborhood pitch and earn your place with Ethiopia.' },
  { title: 'Manager Career', detail: 'Transfers, academies, facilities, staff, tactics, media and national-team jobs.' },
  { title: 'Player Career', detail: 'Build a footballer from school trials to captaincy, retirement and coaching.' },
  { title: 'League & Cup', detail: 'Dynamic seasons, promotion, relegation, suspensions, awards and qualification.' },
  { title: 'Street & Community', detail: '3v3, 4v4, 5v5 and futsal on Ethiopian community grounds.' },
]

export const featurePillars = [
  ['Responsive football', 'Independent ball physics, contextual controls and low input latency.'],
  ['Living football world', 'Aging, youth generation, transfers, manager changes and evolving rivalries.'],
  ['Ethiopian identity', 'Local languages, regions, supporter culture, music and match-day atmosphere.'],
  ['Fair competition', 'Server-authoritative online play, anti-cheat and zero pay-to-win mechanics.'],
  ['Every device', 'PC, console and serious low-spec mobile support with offline modes.'],
  ['Accessible by design', 'Remapping, scalable text, reduced motion, contrast and assisted controls.'],
]

export const roadmap = [
  { phase: '01', title: 'Core prototype', status: 'Playable', items: ['Movement', 'Passing', 'Shooting', 'Basic AI', 'Match clock'] },
  { phase: '02', title: 'Vertical slice', status: 'In build', items: ['Broadcast UI', 'Career sample', 'Commentary sample', 'PC + Android'] },
  { phase: '03', title: 'MVP', status: 'Planned', items: ['Premier League', 'Cup', 'National team', 'Online 1v1', 'Amharic'] },
  { phase: '04', title: 'Full universe', status: 'Vision', items: ['Women', 'Youth', 'Higher League', 'Online clubs', 'Console'] },
]
