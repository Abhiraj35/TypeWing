export const metadata = {
  title: "Changelog",
}

export default function ChangelogPage() {
  return (
    <main className="mx-auto flex max-w-site flex-col gap-6 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Changelog</h1>
      <ol className="list-inside list-decimal space-y-2 text-muted-foreground">
        <li>Scaffold: Next.js 16 + Tailwind v4 + theme infra</li>
        <li>App chrome: header shell with nav</li>
      </ol>
    </main>
  )
}