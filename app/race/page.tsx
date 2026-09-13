"use client"

import { useEffect, useState } from "react"
import {
  ArrowRight,
  BookOpen,
  Lightning,
  Plus,
  Users,
  WarningCircle,
  WifiHigh,
} from "@phosphor-icons/react"
import type { RoomConfig } from "@shared/types"
import { useMultiplayer } from "@/components/multiplayer/multiplayer-provider"
import { Button } from "@/components/motion/button/base"
import { Input } from "@/components/motion/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/motion/tabs"
import { useSettings } from "@/components/settings-context"
import { cn } from "@/lib/utils"

const initialConfig: RoomConfig = {
  wordCount: 30,
  maxPlayers: 4,
  timeLimit: 90,
}

export default function RaceLandingPage() {
  const { fontCssFamily } = useSettings()
  const { connected, error, createRoom, joinRoom } = useMultiplayer()

  const [activeTab, setActiveTab] = useState<string>("create")
  const [username, setUsername] = useState("")
  const [usernameTouched, setUsernameTouched] = useState(false)

  const [roomCode, setRoomCode] = useState("")
  const [roomCodeTouched, setRoomCodeTouched] = useState(false)

  const [config, setConfig] = useState<RoomConfig>(initialConfig)
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium"
  )
  const [openSelect, setOpenSelect] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (error) setSubmitting(false)
  }, [error])

  const sanitizedRoomCode = roomCode
    .toUpperCase()
    .replace(/[^A-Z2-9]/g, "")
    .slice(0, 6)
  const formattedRoomCode =
    sanitizedRoomCode.length > 3
      ? `${sanitizedRoomCode.slice(0, 3)}-${sanitizedRoomCode.slice(3)}`
      : sanitizedRoomCode

  const isNameValid = username.trim().length >= 2
  const nameError =
    usernameTouched && !isNameValid
      ? "Your name must be at least 2 characters"
      : undefined

  const isCodeValid = sanitizedRoomCode.length === 6
  const codeError =
    roomCodeTouched && !isCodeValid
      ? "Room code must be 6 characters"
      : undefined

  const handleDifficultyChange = (val: string) => {
    const diff = val as "easy" | "medium" | "hard"
    setDifficulty(diff)
    const timeLimit = diff === "easy" ? 120 : diff === "hard" ? 60 : 90
    setConfig((prev) => ({ ...prev, timeLimit }))
  }

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault()
    setUsernameTouched(true)
    if (!isNameValid || !connected) return
    setSubmitting(true)
    createRoom(username.trim(), config)
  }

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault()
    setUsernameTouched(true)
    setRoomCodeTouched(true)
    if (!isNameValid || !isCodeValid || !connected) return
    setSubmitting(true)
    joinRoom(sanitizedRoomCode, username.trim())
  }

  return (
    <main
      className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8"
      style={{ fontFamily: fontCssFamily }}
    >
      <div className="animate-fade-in w-full max-w-md sm:max-w-lg">
        {/* Header Badge & Title */}
        <header className="mb-8 text-center">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            Beta
          </span>
          <h1 className="text-3xl font-extrabold tracking-tighter text-foreground sm:text-4xl">
            Race your friends.
          </h1>
        </header>

        {/* Main Card */}
        <div className="relative isolate rounded-3xl border border-border/80 bg-card/85 shadow-2xl shadow-primary/5 backdrop-blur-md">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value)
              setSubmitting(false)
            }}
            variant="segment"
            stack
            className="w-full"
          >
            <div className="p-6 sm:p-8">
              {/* Segmented Control */}
              <TabsList className="grid w-full grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1">
                <TabsTrigger
                  value="create"
                  className="h-10 gap-2 rounded-lg text-sm font-semibold tracking-tight"
                >
                  <Plus size={16} weight="bold" />
                  Create Room
                </TabsTrigger>
                <TabsTrigger
                  value="join"
                  className="h-10 gap-2 rounded-lg text-sm font-semibold tracking-tight"
                >
                  <ArrowRight size={16} weight="bold" />
                  Join Room
                </TabsTrigger>
              </TabsList>

              {/* Panels share a grid cell so the card height never changes on switch */}
              <div className="grid">
                {/* Tab 1: Create Room */}
                <TabsContent
                  value="create"
                  className="col-start-1 row-start-1 m-0 pt-6"
                >
                  <form onSubmit={handleCreateRoom} className="space-y-5">
                    {/* Your Name */}
                    <div>
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
                          field: "rounded-xl",
                          label:
                            "text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5",
                        }}
                      />
                    </div>

                    {/* Room Config */}
                    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                      {/* Word Count */}
                      <div
                        className={cn(
                          "relative",
                          openSelect === "words" ? "z-30" : "z-20"
                        )}
                      >
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <BookOpen
                            size={15}
                            weight="bold"
                            className="text-primary"
                          />
                          Words
                        </label>
                        <Select
                          value={String(config.wordCount)}
                          onValueChange={(val) =>
                            setConfig((prev) => ({
                              ...prev,
                              wordCount: Number(val),
                            }))
                          }
                          open={openSelect === "words"}
                          onOpenChange={(isOpen) =>
                            setOpenSelect(isOpen ? "words" : null)
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl px-3 py-2 text-sm shadow-xs border-none">
                            <SelectValue placeholder="Select word count" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-2xl">
                            <SelectItem value="20">20 words</SelectItem>
                            <SelectItem value="30">30 words</SelectItem>
                            <SelectItem value="50">50 words</SelectItem>
                            <SelectItem value="100">100 words</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Max Players */}
                      <div
                        className={cn(
                          "relative",
                          openSelect === "players" ? "z-30" : "z-20"
                        )}
                      >
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Users
                            size={15}
                            weight="bold"
                            className="text-primary"
                          />
                          Max players
                        </label>
                        <Select
                          value={String(config.maxPlayers)}
                          onValueChange={(val) =>
                            setConfig((prev) => ({
                              ...prev,
                              maxPlayers: Number(val),
                            }))
                          }
                          open={openSelect === "players"}
                          onOpenChange={(isOpen) =>
                            setOpenSelect(isOpen ? "players" : null)
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl border-none bg-background px-3 py-2 text-sm shadow-xs">
                            <SelectValue placeholder="Select players" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-2xl">
                            <SelectItem value="2">2 players</SelectItem>
                            <SelectItem value="3">3 players</SelectItem>
                            <SelectItem value="4">4 players</SelectItem>
                            <SelectItem value="6">6 players</SelectItem>
                            <SelectItem value="8">8 players</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Difficulty */}
                      <div
                        className={cn(
                          "relative col-span-2 sm:col-span-1",
                          openSelect === "difficulty" ? "z-30" : "z-10"
                        )}
                      >
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Lightning
                            size={15}
                            weight="bold"
                            className="text-primary"
                          />
                          Difficulty
                        </label>
                        <Select
                          value={difficulty}
                          onValueChange={handleDifficultyChange}
                          open={openSelect === "difficulty"}
                          onOpenChange={(isOpen) =>
                            setOpenSelect(isOpen ? "difficulty" : null)
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl border-none bg-background px-3 py-2 text-sm shadow-xs whitespace-nowrap">
                            <SelectValue placeholder="Difficulty" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-2xl">
                            <SelectItem value="easy" label="Easy">Easy · 120s</SelectItem>
                            <SelectItem value="medium" label="Medium">Medium · 90s</SelectItem>
                            <SelectItem value="hard" label="Hard">Hard · 60s</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={!connected || !isNameValid || submitting}
                      pressScale={0.98}
                      className="mt-6 h-12 w-full cursor-pointer rounded-xl text-sm font-semibold tracking-wide shadow-md shadow-primary/10 transition-all"
                    >
                      <Plus size={16} weight="bold" />
                      {!connected
                        ? "Connecting..."
                        : submitting
                          ? "Creating Room..."
                          : "Create Room"}
                    </Button>
                  </form>
                </TabsContent>

                {/* Tab 2: Join Room */}
                <TabsContent
                  value="join"
                  className="col-start-1 row-start-1 m-0 pt-6"
                >
                  <form onSubmit={handleJoinRoom} className="space-y-5">
                    {/* Your Name */}
                    <div>
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
                          label:
                            "text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5",
                        }}
                      />
                    </div>

                    {/* Room Code */}
                    <div>
                      <Input
                        label="Room code"
                        value={formattedRoomCode}
                        onChange={(val) => {
                          const raw = val
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, "")
                            .slice(0, 6)
                          setRoomCode(raw)
                          if (!roomCodeTouched) setRoomCodeTouched(true)
                        }}
                        onBlur={() => setRoomCodeTouched(true)}
                        placeholder="ABC-123"
                        maxLength={7}
                        error={codeError}
                        reserveErrorLine
                        classNames={{
                          field: "rounded-xl border-border/80 bg-background/80",
                          label:
                            "text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5",
                          input: "font-mono tracking-[0.18em] uppercase",
                        }}
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={
                        !connected || !isNameValid || !isCodeValid || submitting
                      }
                      pressScale={0.98}
                      className="mt-6 h-12 w-full cursor-pointer rounded-xl text-sm font-semibold tracking-wide shadow-md shadow-primary/10 transition-all"
                    >
                      <ArrowRight size={16} weight="bold" />
                      {!connected
                        ? "Connecting..."
                        : submitting
                          ? "Joining Room..."
                          : "Join Room"}
                    </Button>
                  </form>
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>

        {/* Global Multiplayer Error */}
        {error && (
          <div
            role="alert"
            className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <WarningCircle size={18} weight="fill" className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Bottom Info & Server Status */}
        <footer className="mt-5 text-center">
          <p className="text-xs text-muted-foreground">
            No account needed. Just create a room and share the code.
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <WifiHigh
              size={14}
              className={connected ? "text-emerald-500" : "text-amber-500"}
              weight="bold"
            />
            <span>
              {connected ? "Server connected" : "Connecting to race server..."}
            </span>
          </div>
        </footer>
      </div>
    </main>
  )
}
