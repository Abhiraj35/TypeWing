export interface Player {
  id: string
  name: string
  wpm: number
  progress: number
  finishTime: number | null
  rank: number | null
  spectator: boolean
}

export interface RoomConfig {
  wordCount: number
  maxPlayers: number
  timeLimit: number
}

export type RoomStatus = "waiting" | "countdown" | "racing" | "finished"

export interface RoomState {
  roomId: string
  hostId: string
  status: RoomStatus
  players: Player[]
  config: RoomConfig
}

export interface ClientToServerEvents {
  "room:create": (data: { username: string; config: RoomConfig }) => void
  "room:join": (data: { roomId: string; username: string }) => void
  "game:startRequest": (data: { roomId: string }) => void
  "player:progress": (data: { roomId: string; wpm: number; progress: number }) => void
  "player:finished": (data: { roomId: string; finalWpm: number }) => void
  "game:rematchRequest": (data: { roomId: string }) => void
}

export interface ServerToClientEvents {
  "room:created": (data: { roomId: string }) => void
  "room:state": (data: RoomState) => void
  "room:newHost": (data: { hostId: string }) => void
  "game:countdown": (data: { text: string[]; startAt: number }) => void
  "game:go": (data: { startAt: number; endsAt: number }) => void
  "leaderboard:update": (data: { players: Player[] }) => void
  "player:ranked": (data: { playerId: string; rank: number }) => void
  "game:end": (data: { finalLeaderboard: Player[] }) => void
  "game:rematchVote": (data: { votes: number; needed: number }) => void
  "game:rematchStart": () => void
  error: (message: string) => void
}
