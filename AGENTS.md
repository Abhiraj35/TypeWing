# TypeWing

## Stack

- **Language / Runtime**: TypeScript, Node 22
- **Framework**: Next.js 16 (App Router) + React 19 client; standalone Express 5 + Socket.IO realtime server under `server/`
- **Key dependencies**: socket.io / socket.io-client, motion, tailwindcss v4, recharts, next-themes, phosphor and lucide icons
- **Package manager**: pnpm 10 at the root; `server/` is a standalone package with its own `package.json`

## Build approach

Tracer Bullet (vertical slices that work end to end; the existing room loop is the walking skeleton and each slice thickens it).

## Commands

```bash
# Install
pnpm install

# Dev: standalone Socket.IO server (port 3001)
cd server && pnpm dev

# Dev: Next.js client
pnpm dev

# Build
pnpm build

# Typecheck and lint
pnpm typecheck                  # client
cd server && pnpm typecheck     # game server
pnpm lint

# Test
pnpm test                       # client: vitest on lib/ and shared/ logic
cd server && pnpm test          # game server: vitest unit + wire integration
```

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title.md`.

## Rules

- **Typed wire contract**: every Socket.IO event goes through `shared/types.ts` (`ClientToServerEvents`, `ServerToClientEvents`); never emit untyped events or rename an event in only one layer.
- **Server is authoritative**: race timers, countdowns, progress validation (`validateProgress`, `validateFinishWpm`) and rate limits live server side; client progress is a report, never trusted.
- **Multiplayer UI**: room screens live in `components/multiplayer/`; state flows through `MultiplayerProvider` and `SocketProvider`; pages stay thin and just compose components.
- **Styling**: Tailwind v4 utility classes over design tokens (`card`, `muted-foreground`, `destructive`, `primary`); rounded cards with backdrop blur, `motion` for animation.
- **Shared layer stays dependency free**: `shared/` is imported by both client and server; no framework or client only imports there.
- **Path aliases**: `@/*` maps to the repo root, `@shared/*` to `shared/`.
- **Environment**: client socket URL via `NEXT_PUBLIC_SOCKET_URL` (fallback `SOCKET_URL`, default `http://localhost:3001`, wired in `next.config.mjs`); `FRONTEND_URL` is the server CORS origin.

## Git

- integration: on
- branch: feat/<feature>
- commit: per-milestone

## Agent skills

Declined: websocket-engineer, nextjs-app-router-patterns, next-dev-loop, next-cache-components-adoption, and the alternate vitest/happy-dom/socket.io candidates from the /sync discovery (LambdaTest vitest-skill, PaulRBerg dot-agents, sablier-labs vitest, TerminalSkills happy-dom and socketio, corey-alix happy-dom, iulspop happy-dom-tests, aj-geddes websocket)
Installed: antfu/skills (vitest) for the vitest test suites
MCP recommended, not connected: @djankies/vitest-mcp, to run the suites interactively from an agent

## Context files

- [server/AGENTS.md](server/AGENTS.md): the standalone realtime game server (rooms, validation, deployment)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._