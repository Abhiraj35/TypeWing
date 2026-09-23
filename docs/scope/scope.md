# Scope: TypeWing

TypeWing is a minimalist typing speed test with a real-time multiplayer racing arena, built for typists who want fast, clean practice and live competition.

**Build approach:** Tracer Bullet (vertical slices that work end to end; the existing room loop is the walking skeleton and each slice thickens it).
**Workflow:** Beta (after /develop runs /check verify, then /test). The project default level of rigor. /architect is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (for example · GA) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use /develop and skip /architect. You decide when a feature is done._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| A | Core typing test | Existing | existing |
| B | Results & analytics | Existing | existing |
| C | Settings & personalization | Existing | existing |
| D | Personal bests & persistence | Existing | existing |
| E | Site shell, design system & SEO | Existing | existing |
| 1 | Multiplayer racing | Slice 1 | in-progress |

## Existing (brownfield enrollment)

### A. Core typing test · existing
The single player test loop that is the heart of the product. code in `app/page.tsx`, `components/typing-test.tsx`, `components/word-item.tsx`, `lib/quotes.ts`, `lib/wpm-count.ts`, `lib/keyboard-layouts.ts`, `lib/keyboard-sound-engine.ts`

### B. Results & analytics · existing
Post-test results with charts for WPM, accuracy, and time over the test. Uses recharts. code in `components/results-screen.tsx`, `lib/result-types.ts`, `lib/validate-result.ts`

### C. Settings & personalization · existing
Theme, font, sound, and keyboard layout settings, persisted per device. code in `components/settings-context.tsx`, `components/settings-panel.tsx`, `components/theme-provider.tsx`, `components/theme-toggle.tsx`, `lib/settings-data.ts`

### D. Personal bests & persistence · existing
Personal best tracking stored locally per device. code in `lib/personal-best.ts`

### E. Site shell, design system & SEO · existing
App chrome, the ui and motion component primitives, static pages, metadata, and social cards. code in `app/layout.tsx`, `app/about/page.tsx`, `components/ui`, `components/motion`, `lib/site.ts`

## Slice 1: Multiplayer racing

### 1. Multiplayer racing · in-progress
The room based racing loop runs today but is not production grade: reconnect and refresh behavior, state sync, pacing and fairness, UI polish, and how the server is operated all need rework. This slice is the whole pass. The realtime stack decision is open and the design decides on merit: keep and harden the custom Socket.IO server, or move to a managed realtime service.
**Done when:** a race survives disconnects and refreshes without desync, countdown and race both start and end on time for up to 8 racers, the room and results UI feel as polished as the single player flow, and the server runs reliably as a single instance for up to 50 concurrent racers.
- [x] Design it (spec): `/architect multiplayer racing`
spec: [0001](../specs/0001-multiplayer-racing-hardening.md)
code in `server/`, `app/race/`, `components/multiplayer/`, `shared/types.ts`

**Build plan** (from 0001):
- [ ] Build it: /develop multiplayer racing
  - [x] Milestone 1: Seat identity and the resume thread (token issue, room:resume, replay, playerId based identity, connection states on the track), covers AC-1 and AC-5
  - [x] Milestone 2: Grace, drop, and edge policies (15 second grace and DNF scoring, race to the timer, host migration, rematch cleanup, resume limits and kick), covers AC-2, AC-3, AC-6
  - [x] Milestone 3: UI polish and operations (connection banner, invite and lobby polish, results polish, 50 racer load check), covers AC-4 and AC-6
- [x] Verify it: /check verify multiplayer racing
- [ ] Test it: /test multiplayer racing

## Deferred

Out of scope for this pass, kept so the plan stays honest.
- **Matchmaking**: public lobby browser and quick play · needs a decision
- **Accounts, race history and ratings**: persistent identity across devices · needs a decision
- **In-race chat and reactions**: social layer during races · needs a decision
- **Race replays**: full replay of finished races, beyond today's spectator mode · needs a decision
- **Observability suite**: external logs, error tracking, and uptime alerts for the server · needs a decision
- **Anti-cheat hardening**: stricter validation and rate limiting beyond what the server already does · needs a decision

## Legend

**The decision box.** Every feature carries exactly one, the sub task whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and /architect never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| planned · needs a decision | /scope | one box: `Design it (spec): /architect <feature>` |
| in-progress (designed) | /architect at spec capture | Design it ticked; spec linked; Build it: /develop <feature> plus 2 to 5 milestones; the tier's closing boxes |
| in-progress (building) | /develop | milestone sub boxes tick one by one; code pointer filled |
| done | you, when you decide it is; /sync reconciles | the tier's last stage is the suggested point to call it done |

- Next step = the first unticked box, always a command or a tracked milestone.
- needs a decision = run /architect first; the tag drops once the spec is captured.
- Atomic build tasks live in the spec's build plan, not here; the scope carries only the milestone rollup.
- Status: planned, in-progress, done, plus existing (pre-workflow) and dropped (kept for history).
- Approach tag beside a heading overrides the project default; no tag inherits it.
- Workflow tier tag beside a heading sets one feature's rigor; the header line is the project default.
- Workflow (header): Prototype = nothing after /develop; Alpha = /check verify; Beta = /check verify then /test; GA adds a fresh model /check review then /document. A feature built on an unratified decision stays flagged but that never blocks done.