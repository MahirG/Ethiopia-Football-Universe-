# Installation and Integration

```bash
npm install
npm run audio:validate
npm run lint
npm run build
npm run dev
```

`AudioProvider` wraps the application in `src/main.tsx`. Match code uses `useFootballAudio` and emits semantic events. UI interactions are captured centrally. Settings persist under `efu-audio-settings-v2`.

To connect a new gameplay system, call:

```ts
audio.emit('yellow-card', {
  team: 'home',
  playerName: 'Player name',
  matchMinute: 72,
  scoreHome: 1,
  scoreAway: 1,
})
```

Do not pass audio file paths from gameplay code.
