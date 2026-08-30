import { ThemeToggle } from "@/components/theme-toggle"
import { siteConfig } from "@/lib/site"

export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-site flex-col items-center justify-center gap-6 px-6">
      <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase select-none">
        Coming soon
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">{siteConfig.name}</h1>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        {siteConfig.description}
      </p>
      <ThemeToggle />
    </main>
  )
}