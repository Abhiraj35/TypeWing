import { Doto, Geist_Mono, Space_Grotesk } from "next/font/google"
import type { Metadata } from "next"
import "./globals.css"
import { AppChrome } from "@/components/app-chrome"
import { ThemeProvider } from "@/components/theme-provider"
import { SettingsProvider } from "@/components/settings-context"
import { siteConfig } from "@/lib/site"
import { cn } from "@/lib/utils"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const doto = Doto({
  subsets: ["latin"],
  variable: "--font-doto",
})

export const metadata: Metadata = {
  title: `${siteConfig.name} — Typing Speed Test`,
  description: siteConfig.description,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased font-sans",
        spaceGrotesk.variable,
        fontMono.variable,
        doto.variable,
      )}
    >
      <body suppressHydrationWarning>
        <ThemeProvider>
          <SettingsProvider>
            <AppChrome>{children}</AppChrome>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}