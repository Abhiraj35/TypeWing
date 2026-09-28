import posthog from "posthog-js"

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

if (!token || !host) {
  if (process.env.NODE_ENV === "development") {
    const missingVariable = !token
      ? "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"
      : "NEXT_PUBLIC_POSTHOG_HOST"

    console.warn(
      `[PostHog] ${missingVariable} is not configured. Analytics and session recording are disabled.`,
    )
  }
} else if (typeof window !== "undefined") {
  const useProxy = process.env.NEXT_PUBLIC_POSTHOG_USE_PROXY === "true" || host === "/ingest"
  const apiHost = useProxy ? "/ingest" : host

  posthog.init(token, {
    api_host: apiHost,
    ...(useProxy ? { ui_host: host } : {}),
    person_profiles: "identified_only",
    capture_pageview: false, // Explicitly tracked via PostHogPageView for accurate Next.js SPA transitions
    capture_pageleave: true,
    autocapture: true,
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  })
}
