import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr"
import { siteConfig } from "@/lib/site"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = {
  title: "About",
}

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-site flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">About {siteConfig.name}</h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
          {siteConfig.description}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        <div className="rounded-xl border border-border/70 bg-card/40 p-4">
          <h3 className="text-sm font-semibold text-foreground">Multiple Modes</h3>
          <p className="mt-1 text-xs text-muted-foreground leading-normal">
            Practice with timed runs, word-count sprints, or curated inspirational quotes.
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/40 p-4">
          <h3 className="text-sm font-semibold text-foreground">Acoustic Feedback</h3>
          <p className="mt-1 text-xs text-muted-foreground leading-normal">
            Realistic mechanical switch audio with customizable volume and profiles.
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/40 p-4">
          <h3 className="text-sm font-semibold text-foreground">Interactive Keyboards</h3>
          <p className="mt-1 text-xs text-muted-foreground leading-normal">
            Visual feedback with sculpted and Mac-style layouts in English, French, and German.
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/40 p-4">
          <h3 className="text-sm font-semibold text-foreground">Theme & Font Customization</h3>
          <p className="mt-1 text-xs text-muted-foreground leading-normal">
            Personalize your workspace with bespoke accent colors and typographic choices.
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-border/60 max-w-2xl flex items-center justify-between text-sm text-muted-foreground">
        <span>Open source project</span>
        <a
          href="https://github.com/Abhiraj35/TypeWing"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors"
        >
          View on GitHub
          <ArrowUpRight size={14} aria-hidden />
        </a>
      </div>
    </main>
  )
}