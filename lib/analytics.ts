import posthog from "posthog-js"

/**
 * Checks whether PostHog credentials are fully configured.
 */
const isPostHogConfigured = (): boolean =>
  typeof window !== "undefined" &&
  Boolean(process.env.POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST)

/**
 * Tracks a custom event in PostHog safely.
 * Gracefully no-ops if PostHog is unconfigured or unavailable.
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>): void {
  if (!isPostHogConfigured()) return
  try {
    posthog.capture(eventName, properties)
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[PostHog] Failed to track "${eventName}":`, error)
    }
  }
}

/**
 * Captures an exception in PostHog safely.
 */
export function trackException(error: unknown, properties?: Record<string, unknown>): void {
  if (!isPostHogConfigured()) return
  try {
    posthog.captureException(error, properties)
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[PostHog] Failed to capture exception:", err)
    }
  }
}
