# 0001. Multiplayer racing: production hardening with seat resume

**Date**: 2026-09-22
**Status**: Accepted

## Summary

This spec decides to keep the custom Socket.IO server and harden it, rather than move to a managed realtime service, and designs the one missing production behavior: a racer's seat survives a refresh or a dropped connection, held for 15 seconds, then scored where they stopped. It also settles the additive wire events, the resume token model, and the UI polish surfaces for the room and results. The build then thickens the existing loop into a production grade one. The realtime stack decision and the rework plan both live in this spec.

## Context

The multiplayer room loop works today as a coin flip demo. Rooms, timers, countdown, progress validation, and rate limits all run on a single authoritative Express 5 plus Socket.IO server (basis: server/AGENTS.md). The server is the only authority on race state, which the "server authoritative" rule in AGENTS.md requires. What is missing is continuity: the moment a socket disconnects, the server deletes that player from the room. A refresh mid race is elimination, and the client does nothing smart on reconnect, it wipes local state. The Done when contract on the scope row names exactly these gaps: a race survives disconnects and refreshes without desync, start and end stay on time for up to 8 racers, the room and results UI match single player polish, and the server runs reliably as one instance for up to 50 concurrent racers (basis: docs/scope/scope.md).

Two forces shape the design. First, the load is tiny: 50 concurrent racers is a handful of filled rooms, and the scope explicitly accepts a single instance with in memory rooms. That removes any real pressure to scale out or to hand transport to a vendor. Second, the game's authority is the hard constraint: timers, countdowns, and progress checks must live where a client cannot cheat them. The biggest change this pass makes is not the transport, it is who a player is: the wire contract currently identifies a seat by its socket id, and the client finds "me" in the leaderboard by comparing socket ids. Making a seat survive a new socket means giving each seat its own identity that outlives the connection.

The consequence of not deciding is the current state frozen: every refresh ends a race, reconnect code exists but does nothing useful, and multiplayer stays the weak part of the product next to a polished single player flow.

## Requirements

**User stories**:
- As a racer, I want to refresh mid race and come back to my seat, so a blip does not end my race.
- As a racer, I want to see who is live, reconnecting, or dropped, so the race reads honestly.
- As a host, I want the lobby and results to feel as clean as single player, so multiplayer feels first class.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: A racer who refreshes or briefly drops the connection mid race resumes the same race in place within the grace window, with no desync between their typing and the server state.
- **AC-2**: A seat held past the grace window is scored by its last synced progress and shown as dropped.
- **AC-3**: Countdown and race both start and end on time for up to 8 racers, and a race runs to its timer while at least one racer is live or in grace.
- **AC-4**: The room and race UI surface connection and seat states (reconnecting, held, dropped), and the results show dropped racers with their last progress.
- **AC-5**: A racer can reclaim a seat only with their token, a second live resume replaces the older connection, and the token never appears in any broadcast.
- **AC-6**: The server keeps serving reliably as a single instance with up to 50 concurrent racers, with held seats, resume rate limits, and stale cleanup behaving under load.

## Options considered

### Option 1: Keep and harden the custom Socket.IO server

The existing Express 5 plus Socket.IO server stays. This pass adds seat identity, held seat resume, grace scoring, and polish on top of the current room manager, leaving the authoritative model untouched.

**Pros**:
- The authoritative server is already built; the present work is additive and small.
- Reconnect and resync are plain events in a typed contract the project already owns.
- No new vendor, no new bill, no new failure mode to learn at 2am.

**Cons**:
- Connection recovery, ordering, and catch up are ours to keep correct (Socket.IO reconnection helps transport, not state).
- The team owns the operational story: memory, timers, cleanup, single instance.

### Option 2: Move to a managed realtime service (Ably, Pusher)

A pub/sub vendor carries channels, presence, and reconnect replay; the client talks to the vendor and the vendor to a backend.

**Pros**:
- Managed connection recovery and global fanout for the connective tissue (basis: Ably connection state recovery and replay guidance).
- Off the shelf presence and history.

**Cons**:
- None of these vendors run authoritative game logic. Race timers, progress validation, and room state would still need a backend we run, so the custom server does not go away, it just gains a hop.
- Liveblocks is a CRDT collaboration model, the wrong paradigm for a server authoritative race; Supabase Realtime is database broadcast.
- Cost starts at 29 dollars a month at the entry tier, for a load the current box already carries free.
- Fanout is the billing lever, and leaderboards already fan out to every seat every few hundred milliseconds.

### Option 3: Move to PartyKit on Cloudflare edge

Relocate the room logic to a PartyKit server, which is a custom WebSocket server living on Cloudflare Durable Objects.

**Pros**:
- Very cheap at small scale, global edge latency, no server to operate.
- The protocol would still be ours, so the authority model survives.

**Cons**:
- It is the same room, timer, and validation code rewritten as a PartyServer, on a different platform, with a migration off Railway.
- Cloudflare lock in and a smaller, newer ecosystem around Durable Objects.
- Country of origin: the game is nowhere near the scale where edge placement matters.

## Decision

**Chosen option**: Option 1: Keep and harden the custom Socket.IO server.

The realtime stack stays as it is, and the pass adds seat resume, held seat grace, edge policies, and UI polish. Managed transport loses because authority must stay in our own server anyway, so the vendors add cost and a hop without removing the thing they would replace.

**Implementation skills**: none. The project's AGENTS.md declares websocket-engineer and related skills declined, and no installed skill shapes this decision.

## Rationale

The forces from Context decide it. Authority cannot move to a vendor, so a managed service still leaves a custom server to run; at 50 concurrent racers the take is zero operational gain and a monthly bill, and the largest real change is seat identity, which only we can build regardless of transport (basis: the server authoritative rule in AGENTS.md, plus the current landscape check of managed realtime options). PartyKit is the only managed option that would keep our protocol, but it relocates rather than removes the server and costs a migration for no measured benefit at this scale.

The one teaching point this pass bet on: a seat stops being a socket. socket ids churn on every reconnect, so resume must hang off a server issued playerId and token, never off the transport. Everything else in the rework (grace window, DNF scoring, race to the timer) falls out of that identity existing.

## Feature design

**Data model sketch** (in memory, no database):

| Entity | Key fields | Notes |
|---|---|---|
| Room | id (code, PK), hostId, status, config, text, countdownStartAt, startTime, createdAt, createdByIp, rematchVotes | status is waiting, countdown, racing, or finished |
| Player seat | playerId (PK), resumeToken (secret), roomId (FK), name, spectator | one to many from Room |
| | connectionState (connected, reconnecting, dropped) | live, held in grace, or scored and gone |
| | socketId (nullable) | ephemeral, rebinds on resume |
| | progress, wpm, finishTime, rank | the race figures |
| | seatExpiresAt (nullable) | set when reconnecting, cleared on resume |

**State transitions**:

Room status is unchanged: waiting to countdown to racing to finished, with rematch reset back to waiting.

Seat connectionState: connected flips to reconnecting on socket disconnect, back to connected on a successful resume, or to dropped when seatExpiresAt passes. Dropped is terminal for the current race and dropped seats are removed at rematch reset.

**API surface** (all four events additive to `shared/types.ts`; the existing events stay, and `Player` gains connectionState, playerId, and seatExpiresAt while resumeToken stays off the wire for every broadcast):

| Event | Direction | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| room:resume | client to server | roomId, resumeToken | race snapshot | token matches a held seat | invalid token, room gone, race over |
| player:seat | server to owner only | none | playerId, resumeToken | issued at create or join | none |
| player:connection | server to room | none | playerId, connectionState | none | none |
| player:seatResumed | server to owner | none | playerId, progress, wpm | resumed socket only | none |

The token is returned once over the owning socket and stored client side in sessionStorage keyed by room code, so it survives a refresh and dies with the tab.

**Value sourcing** (every value each action produces names where it comes from):

| Action | Value produced or displayed | Source |
|---|---|---|
| Create or join room | playerId and resumeToken | server generated, emitted once in player:seat |
| Rejoin after refresh | seat restored, last progress | server Player by resumeToken, state replayed from room fields |
| Rejoin mid race | racing snapshot (text, startAt, endsAt) | room fields, existing game:countdown and game:go events |
| Rejoin into waiting or finished room | lobby or results view | room:state alone, named in build task 2 |
| Leaderboard | who is live, held, dropped | connectionState on each Player, pushed via player:connection |
| "Is me" in room UI | own seat highlight | playerId from player:seat, stored in sessionStorage and provider state |
| Start race | host permission | hostId on room compared to my playerId |
| Results | dropped racers with last figures | progress and wpm frozen at drop by the server |
| Countdown and end on time | startAt, endsAt | server timers, absolute epoch milliseconds |
| Race to timer | still open while any racer lives | live plus grace seat count from connectionState |

**Key invariants**:
- Only one live socket per seat at a time; a second resume kicks the older socket out of the room.
- resumeToken never appears in any broadcast; it leaves the server exactly once, to the owning socket.
- A held seat counts toward maxPlayers, so the room cannot silently overfill.
- Resume only ever replays the seat at or behind its last synced progress, never ahead, so the existing progress validation still holds.
- game end fires only when no racer is live or in grace.
- Seat grace timers are unref'd like the other server timers, so the process can still exit.

**Security model**:
- No accounts; seat ownership is possession of the resumeToken.
- The host of the room owns start and rematch controls, matched by playerId.
- Existing per socket, per event rate limits stay, and room:resume gets its own, set at 6 per 10 seconds per socket.
- Nobody can read another seat's progress or token; broadcasts carry progress and state, never secrets.

**Configuration required**:
- No new environment variables or credentials.
- New server constant in `server/constants.ts`: `SEAT_GRACE_MS = 15000` for the held seat window.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: racer refreshes mid race and resumes at their synced progress, countdown and go replayed, no double seats, verifies **AC-1**.
- Failure case: racer never returns, seat scores at last progress after 15 seconds and shows dropped in the track and results, verifies **AC-2**.
- Timing: a race with a lone live racer runs to the timer end instead of ending early, verifies **AC-3**.
- Auth and permission: an invalid or foreign resumeToken is rejected, the owning token is also rejected when the room is gone, verifies **AC-5**.
- Load: 50 concurrent racers across filled rooms with churn (refreshes, drops, resumes) stays within rate limits and keeps timers and cleanup on schedule, verifies **AC-6**.

## Build plan

Ordered by the project's Tracer Bullet approach: stand up the thin resume thread end to end first, then thicken reliability and polish.

1. Seat identity: server maps seats by playerId, issues playerId and resumeToken on create and join, emits player:seat, rekeys rematch votes to playerId, and serializes room:state with the new Player fields but never the token, satisfies **AC-1**, **AC-5**.
2. Resume thread: room:resume event, client stores the token in sessionStorage, reconnects and resumes by room code on mount, replays room:state plus game:countdown and game:go for a racing room and renders from room:state alone for a waiting or finished room, and the client resolves "me" by playerId instead of socket id, satisfies **AC-1**.
3. Connection states: seats flip to reconnecting on disconnect, player:connection broadcasts the change, and the race track shows live, held, and dropped states, satisfies **AC-1**, **AC-4**.
4. Grace and drop: SEAT_GRACE_MS of 15 seconds, seatExpiresAt on disconnect, resume clears it, expiry marks the seat dropped and the results include its last progress, with a no-op guard so an expiry timer does nothing when the seat or room is already gone, satisfies **AC-2**.
5. Edge policies: game end fires only when no racer is live or in grace, host migration prefers a connected racer, rematch reset removes dropped seats, satisfies **AC-3**.
6. Resume hardening: room:resume rate limit, second live resume kicks the older socket, held seats count toward maxPlayers, satisfies **AC-5**, **AC-6**.
7. UI polish: connection banner (reconnecting, seat held, dropped), lobby invite actions (copy code and link, participant count, host controls), and results showing per racer WPM and accuracy, DNF markers, and a clean rematch and leave flow, satisfies **AC-4**.
8. Operations: seat timers unref'd, held seat accounting exercised under a 50 racer churn scenario, stale room reaping unchanged but verified with held seats, satisfies **AC-6**.

## Consequences

**Positive**:
- A refresh no longer ends a race; the mode matches single player polish, which is the point of the scope row.
- Seat identity is the load bearing piece for future matches, accounts, and race history on the deferred list.
- The wire contract stays typed and additive; every new event is checked by the existing client and server typecheck.

**Negative or tradeoffs**:
- The team owns reconnect recovery and state catch up forever; nothing upstream fills a missed message.
- A resumed racer re seats at the last server synced progress, which lags their true position by up to a few hundred milliseconds and a fraction of a word, a small visual gap on the track.
- Player.id changing meaning from socket id to playerId is a coordinated change across server and client that ships in one window.

**Neutral**:
- The deployment story stays two boxes: the server container on Railway and the client on Vercel, now shipped together for this change.
- The realtime stack decision is recorded and settles the scope row's open question; future scale past a single instance would revisit it, with PartyKit the least bad path if that day comes.

## Follow-up

- [ ] Review the sessionStorage resume token choice when accounts or multi device support land on the deferred list; tokens are per tab today, so a second tab means a second seat.
- [ ] Add a playbook note that server restarts still drop live rooms by design, and the client should show a clear server restarted message on the next refresh.
- [ ] Rate limits are per socket today, and a refresher opens a fresh socket each time, so room:resume limits do not bind a determined refresher; revisit when anti-cheat hardening lands.

## References

**Project sources** (verifiable, in this repo):
- `AGENTS.md`, the typed wire contract and server authoritative rules
- `server/AGENTS.md`, the room and race ownership map
- `docs/scope/scope.md`, the multiplayer racing row and Done when contract
- `shared/types.ts` and `server/`, the current event surface this spec extends

**Practices & standards**:
- Anonymous session continuity via short lived resume tokens, the same shape as ticket based rejoin patterns
- Soft state grace windows with expiry for connection loss
- Server authored clocks and validation as the anti-cheat base, kept untouched

**Links** (web verified only):
- Ably vs Pusher comparison (pricing and limits): https://ably.com/compare/ably-vs-pusher/pricing
- Real time sync landscape, Supabase Realtime vs Liveblocks vs PartyKit: https://www.duskolicanin.com/blog/real-time-saas-supabase-vs-liveblocks-vs-partykit-2026
- PartyKit hibernation scaling guide: https://docs.partykit.io/guides/scaling-partykit-servers-with-hibernation/

## Migration plan

**Strategy**: feature-flagged coordinated change in a small codebase.

**Phases**:
1. Server lands first: seat identity, resume, grace. The client and server typecheck each against the same shared types snapshot.
2. Client lands in the same window: resume flow, playerId based identity, connection UI, polish.

**Rollback**: reverting the server commit restores socket id identity; the current client logic works against it as before, only the new UI flags idle.

**Risks**: the two deployments must go together here because Player.id changes meaning; while they are apart, a stale tab can mis highlight "me" on the track, a cosmetic-only failure.