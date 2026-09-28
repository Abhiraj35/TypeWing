"use client"

import NextError from "next/error"
import { useEffect } from "react"
import { trackException } from "@/lib/analytics"

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    trackException(error, { digest: error.digest })
  }, [error])

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  )
}
