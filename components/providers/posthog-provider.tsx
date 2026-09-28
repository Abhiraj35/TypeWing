"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { Suspense, useEffect } from "react"
import posthog from "posthog-js"
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react"

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const client = usePostHog()

  useEffect(() => {
    if (pathname && client) {
      let url = window.origin + pathname
      const search = searchParams?.toString()
      if (search) {
        url = `${url}?${search}`
      }
      client.capture("$pageview", { $current_url: url })
    }
  }, [pathname, searchParams, client])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  )
}
