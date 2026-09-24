# TypeWing Realtime Server

## Overview

Standalone Express 5 + Socket.IO authoritative game server for multiplayer typing races. Owns room lifecycle, race timers, countdowns, progress validation, and rate limiting. Runs as its own container (Dockerfile) on port 3001, deployed to Railway.

## Key files

| File | Owns |
|---|---|
| `index.ts` | Socket.IO wiring, event handlers, game end and rematch orchestration |
| `room-manager.ts` | Room lifecycle: create/join/leave, host migration, cleanup, rematch reset |
| `game-logic.ts` | Word generation and anti-cheat progress / WPM validation |
| `rate-limiter.ts` | Per socket, per event rate limits |
| `constants.ts` | Tunables: limits, options, countdown, cleanup windows |

## Commands

```bash
cd server
pnpm dev          # tsx watch index.ts
pnpm start        # tsx index.ts
pnpm typecheck
pnpm test         # vitest: room manager unit + Socket.IO wire integration
```

## Conventions

- Typed events from `@shared/types`; the server is the only authority on room state, timers, and results.
- Rooms are in memory (`Map<string, Room>`); codes are 6 characters from an unambiguous nanoid alphabet.
- Late joiners become spectators; host departure migrates the host; races end when the server timer expires or fewer than two racers remain.
- Idempotent guards on every handler: already in a room, wrong room status, finished player.
- Wire integration tests boot the real server on a random port (vitest `env.PORT=0`); every test socket shares one IP, so the suite reuses a single room to stay under the 5 rooms per IP cap and pre attaches listeners before emitting to avoid losing a burst of events.

## Gotchas

- Single instance, in memory: rooms vanish on restart; horizontal scaling needs a socket.io adapter (for example `@socket.io/redis-adapter`) plus persisted state.
- The Dockerfile installs with `npm install` and runs the server only; the Next.js client deploys separately (Vercel).
- CORS origin comes from `FRONTEND_URL` (default `http://localhost:3000`, the Next.js client origin); health probe at `/health` for the Railway healthcheck.
- Timers are `.unref()`d so the process can exit; stale waiting rooms are reaped every 60 seconds.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._