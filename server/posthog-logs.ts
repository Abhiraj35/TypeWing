import { SeverityNumber } from "@opentelemetry/api-logs"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import { resourceFromAttributes } from "@opentelemetry/resources"
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs"

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

// The client is often configured with a same-origin proxy path ("/ingest") for
// ad blocking. That is correct for the browser but not for this process: the
// exporter is an HTTP client with no base URL, so a relative host silently
// produces requests that can never leave the process. Require an absolute one.
const isAbsoluteHttpUrl = (value: string | undefined): value is string =>
  typeof value === "string" && /^https?:\/\/[^/\s]+/i.test(value)

function getLoggerProvider(): LoggerProvider | null {
  if (!isAbsoluteHttpUrl(host) || !token) {
    if (process.env.NODE_ENV === "development") {
      const missingVariable = !token
        ? "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"
        : "NEXT_PUBLIC_POSTHOG_HOST"

      console.warn(
        `[PostHog Server] ${missingVariable} variable required by PostHog is not configured, or is not an absolute http(s) URL. Server log export is disabled.`,
      )
    }

    return null
  }

  return new LoggerProvider({
    resource: resourceFromAttributes({ "service.name": "typewing-realtime" }),
    processors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
          url: `${host.replace(/\/$/, "")}/i/v1/logs`,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
      }),
    ],
  })
}

const loggerProvider = getLoggerProvider()

// This is intentionally not registered as the global provider: only logs
// emitted through this dedicated logger are exported to PostHog.
const logger = loggerProvider?.getLogger("typewing-posthog-logs") ?? null

type LogAttributes = Record<string, boolean | number | string>

function emit(body: string, attributes: LogAttributes): void {
  logger?.emit({
    severityNumber: SeverityNumber.INFO,
    body,
    attributes,
  })
}

export function logRoomCreated(maxPlayers: number, timeLimitSeconds: number, wordCount: number): void {
  emit("multiplayer room created", {
    event: "multiplayer_room_created",
    max_players: maxPlayers,
    time_limit_seconds: timeLimitSeconds,
    word_count: wordCount,
  })
}

export function logRaceStarted(playerCount: number, timeLimitSeconds: number, wordCount: number): void {
  emit("multiplayer race started", {
    event: "multiplayer_race_started",
    player_count: playerCount,
    time_limit_seconds: timeLimitSeconds,
    word_count: wordCount,
  })
}

export function logRaceFinished(playerCount: number, completedPlayerCount: number): void {
  emit("multiplayer race finished", {
    event: "multiplayer_race_finished",
    player_count: playerCount,
    completed_player_count: completedPlayerCount,
  })
}

export async function shutdownPosthogLogs(): Promise<void> {
  try {
    await loggerProvider?.shutdown()
  } catch {
    // Logging must not prevent the realtime service from stopping cleanly.
  }
}
