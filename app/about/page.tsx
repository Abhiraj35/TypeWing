import { siteConfig } from "@/lib/site"

export const metadata = {
  title: "About",
}

export default function AboutPage() {
  return (
    <main className="mx-auto flex max-w-site flex-col gap-6 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">About {siteConfig.name}</h1>
      <p className="text-muted-foreground">
        {siteConfig.description}
      </p>
      <p className="text-muted-foreground">
        This is a learning build of KeyBr — a typing test website — being
        rebuilt from a blank scaffold one feature at a time.
      </p>
    </main>
  )
}