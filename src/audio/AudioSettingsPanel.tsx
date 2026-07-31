import type { Dispatch, SetStateAction } from 'react'
import type { AudioSettings } from './types'

interface Props {
  settings: AudioSettings
  patch: (next: Partial<AudioSettings>) => void
  reset: () => void
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}

const volumeRows: Array<[keyof AudioSettings, string]> = [
  ['master', 'Master'], ['music', 'Music'], ['commentary', 'Commentary'], ['crowd', 'Crowd'], ['announcer', 'Stadium PA'], ['effects', 'Effects'], ['weather', 'Weather'], ['ui', 'Interface'], ['voiceChat', 'Voice chat'],
]

export function AudioSettingsPanel({ settings, patch, reset, open, setOpen }: Props) {
  if (!open) return null
  return (
    <aside className="audio-settings-panel panel">
      <div className="audio-settings-heading"><div><span>PRODUCTION AUDIO</span><h3>Mix & accessibility</h3></div><button onClick={() => setOpen(false)}>×</button></div>
      <div className="audio-volume-grid">
        {volumeRows.map(([key, label]) => <label key={String(key)}><span>{label}</span><input type="range" min="0" max="1" step="0.02" value={Number(settings[key])} onChange={(event) => patch({ [key]: Number(event.target.value) } as Partial<AudioSettings>)} /><b>{Math.round(Number(settings[key]) * 100)}</b></label>)}
      </div>
      <div className="audio-select-grid">
        <label>Commentary<select value={settings.commentaryLanguage} onChange={(event) => patch({ commentaryLanguage: event.target.value as AudioSettings['commentaryLanguage'] })}><option value="am">አማርኛ</option><option value="om">Afaan Oromo</option><option value="en">English</option><option value="ti">ትግርኛ</option><option value="so">Somali</option></select></label>
        <label>Stadium PA<select value={settings.announcerLanguage} onChange={(event) => patch({ announcerLanguage: event.target.value as AudioSettings['announcerLanguage'] })}><option value="am">አማርኛ</option><option value="om">Afaan Oromo</option><option value="en">English</option><option value="ti">ትግርኛ</option><option value="so">Somali</option></select></label>
        <label>Dynamic range<select value={settings.dynamicRange} onChange={(event) => patch({ dynamicRange: event.target.value as AudioSettings['dynamicRange'] })}><option value="night">Night mode</option><option value="tv">Television</option><option value="headphones">Headphones</option><option value="home-theatre">Home theatre</option><option value="full">Full range</option></select></label>
        <label>Audio quality<select value={settings.quality} onChange={(event) => patch({ quality: event.target.value as AudioSettings['quality'] })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="ultra">Ultra</option></select></label>
      </div>
      <div className="audio-toggle-grid">
        {([
          ['enabled', 'Master audio'], ['commentaryEnabled', 'Spoken commentary'], ['announcerEnabled', 'Stadium announcer'], ['musicEnabled', 'Music'], ['mono', 'Mono output'], ['subtitles', 'Speech subtitles'], ['closedCaptions', 'Closed captions'], ['visualIndicators', 'Visual sound indicators'],
        ] as Array<[keyof AudioSettings, string]>).map(([key, label]) => <label key={String(key)}><input type="checkbox" checked={Boolean(settings[key])} onChange={(event) => patch({ [key]: event.target.checked } as Partial<AudioSettings>)} /><span>{label}</span></label>)}
      </div>
      <button className="secondary-button audio-reset" onClick={reset}>Reset audio settings</button>
    </aside>
  )
}
