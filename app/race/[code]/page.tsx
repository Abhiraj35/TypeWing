import { RaceRoomClient } from "./race-room-client"

// Room codes are runtime state; block this route instead of trying to prerender
// a route whose params arrive from the live multiplayer flow.
export const instant = false

export default async function RaceRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return <RaceRoomClient code={code} />
}
