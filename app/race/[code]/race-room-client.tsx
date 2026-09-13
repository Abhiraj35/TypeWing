"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, WarningCircle, WifiHigh } from "@phosphor-icons/react"
import { CountdownOverlay } from "@/components/multiplayer/countdown-overlay"
import { RaceResults } from "@/components/multiplayer/race-results"
import { RaceView } from "@/components/multiplayer/race-view"
import { RoomLobby } from "@/components/multiplayer/room-lobby"
import { useMultiplayer } from "@/components/multiplayer/multiplayer-provider"
import { useSocket } from "@/components/multiplayer/socket-provider"
import { useSettings } from "@/components/settings-context"
import { Button } from "@/components/motion/button/base"
import { Input } from "@/components/motion/input"

export function RaceRoomClient({ code: rawCode }: { code: string }) {
  const code = rawCode.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6)
  const formattedCode = code.length > 3 ? `${code.slice(0, 3)}-${code.slice(3)}` : code

  const { roomState, countdown, raceText, finalLeaderboard, error, joinRoom } = useMultiplayer()
  const { socket, connected } = useSocket()
  const { fontCssFamily } = useSettings()

  const [username, setUsername] = useState("")
  const [usernameTouched, setUsernameTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (error) setSubmitting(false)
  }, [error])

  const matchingRoom = roomState?.roomId === code ? roomState : null
  const isSpectator = matchingRoom?.players.find((player) => player.id === socket.id)?.spectator ?? false

  const isNameValid = username.trim().length >= 2
  const isCodeValid = code.length === 6
  const nameError =
    usernameTouched && !isNameValid
      ? "Your name must be at least 2 characters"
      : undefined

  const handleJoin = (event: React.FormEvent) => {
    event.preventDefault()
    setUsernameTouched(true)
    if (!isCodeValid || !isNameValid || !connected) return
    setSubmitting(true)
    joinRoom(code, username.trim())
  }

  if (!matchingRoom) {
    return (
      <main
        className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-site items-center justify-center px-4 py-8 sm:px-6 lg:px-8"
        style={{ fontFamily: fontCssFamily }}
      >
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-4">
            <Link
              href="/race"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft size={14} />
              <span>Back to Race Hub</span>
            </Link>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/85 p-7 shadow-2xl shadow-primary/5 backdrop-blur-md sm:p-9">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Multiplayer Race
                </p>
                <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Join Room
                </h1>
              </div>

              <div className="flex items-center rounded-xl border border-border/80 bg-background/80 px-3 py-1.5 font-mono text-xs font-semibold tracking-[0.18em] text-foreground shadow-2xs">
                {formattedCode}
              </div>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              Enter your racer callsign to jump into this race lobby.
            </p>

            <form onSubmit={handleJoin} className="mt-6 space-y-4">
              <Input
                label="Your name"
                value={username}
                onChange={(val) => {
                  setUsername(val)
                  if (!usernameTouched) setUsernameTouched(true)
                }}
                onBlur={() => setUsernameTouched(true)}
                placeholder="SpeedDemon"
                maxLength={20}
                error={nameError}
                reserveErrorLine
                classNames={{
                  field: "rounded-xl border-border/80 bg-background/80",
                  label: "text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5",
                }}
              />

              <Button
                type="submit"
                variant="primary"
                disabled={!connected || !isCodeValid || !isNameValid || submitting}
                pressScale={0.98}
                className="h-12 w-full rounded-xl text-sm font-semibold tracking-wide shadow-md shadow-primary/10 transition-all cursor-pointer"
              >
                <ArrowRight size={16} weight="bold" />
                {!connected
                  ? "Connecting to server..."
                  : submitting
                    ? "Entering Lobby..."
                    : "Enter Lobby"}
              </Button>
            </form>

            {error && (
              <div
                role="alert"
                className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                <WarningCircle size={18} weight="fill" className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <footer className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <WifiHigh
              size={14}
              className={connected ? "text-emerald-500" : "text-amber-500"}
              weight="bold"
            />
            <span>{connected ? "Server connected" : "Connecting to race server..."}</span>
          </footer>
        </div>
      </main>
    )
  }

  if (countdown !== null) {
    return (
      <>
        <CountdownOverlay count={countdown} words={raceText} />
        <RaceView spectator={isSpectator} />
      </>
    )
  }

  if (matchingRoom.status === "waiting") {
    return <RoomLobby room={matchingRoom} />
  }

  if (matchingRoom.status === "finished") {
    return <RaceResults players={finalLeaderboard ?? matchingRoom.players} />
  }

  return <RaceView spectator={isSpectator} />
}
