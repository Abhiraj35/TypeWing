# Feature 2 — AppChrome + Settings Context + Settings Panel

Detailed walkthrough of what was built, why, and how it maps to the reference
project (`~/Developer/keyboard/zenkey/`).

---

## 0. The big picture

The goal of this rebuild is to **learn by adding one feature per session**. Each
session, we look at how the reference (zenKey / original TypeFlow) solves a
problem, and we re-implement a *scoped* version of it in our starter
(`~/Developer/keyboard/keyBr/`), then verify `lint` / `typecheck` / `build`.

### Project layout (clarified)

| Path | Role |
| --- | --- |
| `~/Developer/keyboard/keyBr/` | **Our project** — the one we are building. Was `typeflow-starter`. |
| `~/Developer/keyboard/zenkey/` | **Reference** — the original TypeFlow we study. Was `~/Downloads/keyBr/`. |

> Earlier context said "the starter lives at
> `~/Downloads/typeflow-starter/`". The user renamed/moved things, which caused
> confusion. We reconciled it by reading both directories (their contents are
> unambiguous): `keyBr/` is the sparse starter, `zenkey/` is the full app.

### Where we were (end of Feature 1)

- `app/layout.tsx` rendered a standalone `<SiteHeader />` + `{children}` inside
  `ThemeProvider`.
- `components/site-header.tsx` was a self-contained header (logo, About,
  Changelog, GitHub).
- `components/theme-provider.tsx` + `theme-toggle.tsx` handled light/dark via
  `next-themes`.
- helpers: `lib/utils.ts` (`cn`), `lib/site.ts` (config),
  `lib/get-strict-context.tsx` (context factory), `hooks/use-mounted.ts`.

---

## 1. What the reference does (the target pattern)

In `~/Developer/keyboard/zenkey/app/layout.tsx` the provider nesting is:

```
<body>
  <ThemeProvider>            ← next-themes
    <SettingsProvider>       ← app settings (accent/font/theme/… + localStorage)
      <AppChrome>            ← chrome shell: header + settings panel + context
        {children}           ← the page
      </AppChrome>
    </SettingsProvider>
  </ThemeProvider>
</body>
```

And `AppChrome` (in reference `components/app-chrome.tsx`) does two jobs:

1. **Owns a context** (`AppChromeContext`) that exposes UI-shell state such as
   `settingsOpen` / `setSettingsOpen`, `typingActive`, refs (`homeLogoHandlerRef`,
   `startPracticeRef`). This is how the header button talks to the settings panel
   and how the typing test will later communicate with the header.
2. **Renders the `SiteHeader`** (as an internal component, not a separate top-level
   component) and **renders the `SettingsPanel` at its root**.

The key structural takeaway: **the header is not a standalone sibling of the
page anymore — it lives inside a provider shell** so it can share state (e.g.
"is the user currently typing? → dim the header") with whatever is on the page.

---

## 2. What we built and why

### 2.1 `lib/settings-data.ts` — pure data, server-safe

**Why a separate data file?**
- Settings options (accent colors, fonts) are plain, serializable constants. They
  don't touch the browser, so they can be imported by server and client code
  safely.
- Keeping data separate from the provider keeps the provider focused on
  *behavior* (state + localStorage), which matches the reference's
  `lib/settings-data.ts` and makes testing/extending easier.

We defined:
- `AccentColor` (19 base accents) and `TypingFont` (a small curated set: a few
  mono, display, one serif, one handwriting — we deliberately trimmed the
  reference's huge list because, per the roadmap, we only need the **hand-written
  base accents** first and we don't yet need the theme auto-sync fonts).
- `ACCENT_COLORS` with `{ id, label, swatch }` where `swatch` is an OKLCH color
  usable both as a CSS background for the picker and (roughly) matching the
  accent CSS blocks.
- `FONT_OPTIONS` with `{ id, label, googleFamily, cssFamily, tag }` — `cssFamily`
  is what we apply to the DOM (`--typing-font`), `googleFamily` is used to
  dynamically load a font from Google Fonts when chosen; `tag` groups fonts for
  presentation.
- `DEFAULT_SETTINGS` — the starting shape `{ accent: "teal", font: "geist-mono" }`.

### 2.2 `hooks/use-mount-effect.ts` — the eslint-safe "run once on mount" hook

**The problem:** our eslint config uses React 19 rules where
`react-hooks/set-state-in-effect` is an **error**. Loading settings from
`localStorage` involves running code once on the client and setting state
(`setAccentState`, `setSettingsLoaded`, …). A bare
`useEffect(() => { … }, [])` that sets state trips the linter.

**The reference's solution:** a tiny wrapper `useMountEffect(effect)` that just
calls `useEffect(effect, [])`. It documents intent ("one-time external sync on
mount: DOM integration, browser API subscriptions, loading browser-only
state") and carries a targeted eslint-disable for the dep array.

> This is the same pattern the reference uses, and it builds clean under the
> identical eslint config — we verified that empirically with `pnpm build`.

Note: our starter already had `hooks/use-mounted.ts` (a `useSyncExternalStore`
gate that returns `true` only after hydration). That is a *different* tool: it is
for **gating render output** (e.g. "don't render until hydrated"). `useMountEffect`
is for **running a one-time side effect**. Both exist because they solve
different problems. The reference uses `useMountEffect` for the settings load;
we kept `useMounted` for the theme toggle.

### 2.3 `components/settings-context.tsx` — the settings store

State + persistence for `accent` and `font` (the roadmap scopes the settings
context to `theme/accent/font`; theme itself is owned by `next-themes`, so the
context handles accent + font).

Why the `settingsLoaded` flag:
- `localStorage` only exists in the browser. During SSR there is nothing to read,
  so the initial state is the default (`teal` / `geist-mono`).
- If a page tried to render using the settings before hydration, it would briefly
  render with defaults and then jump to the saved values (a flash of wrong UI).
- `settingsLoaded` is set to `true` only after the mount effect reads
  `localStorage`. Pages can gate on it to avoid that flash — the hydration-safe
  pattern the plan called out.

Persistence strategy:
- On mount (`useMountEffect`): read a single JSON blob under `tf-settings`,
  validate/fall back to defaults, apply `data-accent` to `<html>`, apply
  `--typing-font`, then flip `settingsLoaded`.
- On change: `setAccent` / `setFont` update React state, apply to the DOM, and
  write the whole settings object back to `localStorage`.

DOM application helpers:
- `applyAccentToDom(accent)` sets `data-accent` on `<html>`. That attribute is
  consumed by the accent CSS blocks we added to `globals.css`.
- `applyFontToDom(fontId)` looks up the option, dynamically injects a Google Font
  `<link>` if needed, and sets `--typing-font` on `<html>`.

`fontCssFamily` is derived and exposed so components (like the preview in the
panel) can render in the user's chosen font.

> We use a single JSON key (`tf-settings`) instead of the reference's many
> separate keys (`tc-accent`, `tc-font`, …). Either works; the JSON blob is
> simpler to reason about and extend for our scoped feature. (The reference uses
> one-key-per-setting, which scales better once many settings exist. Noted as a
> future trade-off.)

### 2.4 `components/app-chrome.tsx` — the chrome shell

This is the centerpiece. It:

1. **Creates the app-chrome context using our `getStrictContext` factory** —
   it returns a `[Provider, useHook]` pair and throws outside the provider. We
   used `getStrictContext` deliberately (the starter ships it, and the plan says
   to use it) instead of hand-rolling `createContext` + `useContext` + null-check
   as the reference does — same result, less boilerplate.
2. **Holds shell state**: `settingsOpen` / `setSettingsOpen`.
3. **Renders the `SiteHeader` internally** — so the header can call
   `useAppChrome()` directly and wire its gear button to `setSettingsOpen(true)`.
4. **Renders `SettingsPanel` at the root**, passing `open` and `onClose`.

Why move the header inside a provider shell (instead of keeping it as a
standalone component in the layout)?
- The header needs to trigger the settings panel and, later, respond to typing
  state (dim while typing, restart on logo click). Shared state must live above
  both the header and the page → hence a provider that wraps everything and owns
  the header.
- This matches the reference architecture exactly and sets us up for
  `typingActive` / `homeLogoHandlerRef` etc. in Feature 3+ without restructuring.

We also moved the nav into `app-chrome.tsx` and added a **gear button** (phosphor
`Gear`) that opens the panel, keeping the existing About / Changelog / GitHub
links. The old `components/site-header.tsx` was deleted — its job moved here.

> Scope note: the reference context also exposes `testSettingsOpen`,
> `typingActive`, and refs. We deliberately added only `settingsOpen` for now to
> keep Feature 2 focused; the rest arrives with their sessions.

### 2.5 `components/settings-panel.tsx` — the slide-in panel

A right-side panel (desktop) using `motion` (`AnimatePresence` + spring slide),
matching the reference's visual language (uppercase micro-labels, bordered
controls, swatch grid). It contains, scoped to the roadmap:

- **Theme** — a light / dark / system 3-button control powered by
  `next-themes` (`useTheme`). We keep the active state based on `resolvedTheme`.
- **Accent** — a grid of swatches from `ACCENT_COLORS`; clicking calls
  `setAccent`, and the accent CSS recolor takes effect live.
- **Font** — a list of `FONT_OPTIONS`, each rendered in its own `fontFamily`
  so the user previews the font, plus a `tag` caption (mono/display/…).
- **Preview** — a sentence rendered in `fontCssFamily` so changes are visible.

The panel is rendered once by `AppChrome` with `open`/`onClose`, and toggled by
the `AnimatePresence` wrapper.

### 2.6 `app/layout.tsx` — wire it all together

Provider nesting now mirrors the reference:

```
<ThemeProvider>       ← next-themes
  <SettingsProvider>  ← accent/font + localStorage
    <AppChrome>       ← header + settings panel + app-chrome context
      {children}
    </AppChrome>
  </SettingsProvider>
</ThemeProvider>
```

`SettingsProvider` must sit *above* `AppChrome` because `AppChrome` renders the
`SettingsPanel`, which calls `useSettings()`. `ThemeProvider` sits outermost
because `next-themes` needs to be above anything that uses `useTheme`.

### 2.7 `app/globals.css` — accent color blocks

The reference keeps accent theming in CSS via
`:root[data-accent="…"] { --primary: …; --ring: … }`. We re-added the
**hand-written base accents** (19 of them, each with a `.dark` variant) to our
`globals.css`. Because `--primary` is referenced by Tailwind's `--color-primary`,
setting `data-accent` on `<html>` live-recolors the entire UI (buttons, links,
selection, etc.) — that's the "accent theme" mechanism.

> We deliberately did **not** add the "Auto-synced theme accents" section — the
> plan explicitly says we only need the hand-written base ones first; auto-sync
> comes with the color-theme feature later.

### 2.8 Dependency added: `motion`

The plan said "start importing `motion` when animation is needed". The panel
needs a slide/fade animation, so we installed `motion` (the successor to
`framer-motion`; the reference imports `motion/react`). This is consistent with
the "install a package only when its feature needs it" learning rule.

---

## 3. Key design decisions summarized ("why")

| Decision | Why |
| --- | --- |
| Separate server-safe data file (`settings-data.ts`) | Avoids browser-only APIs in pure data; matches reference; easy to test. |
| `useMountEffect` wrapper | Sidesteps the `react-hooks/set-state-in-effect` eslint error while expressing "run once on mount". |
| `settingsLoaded` flag | Prevents SSR-hydration flash of default vs saved settings. |
| Single JSON `localStorage` key | Simpler for a scoped feature (reference uses many keys — re-evaluate when settings grow). |
| Move header inside `AppChrome` | Header needs shared shell state (panel open, later typing active); must sit under the provider like the page. |
| `getStrictContext` for app-chrome | Starter ships it; avoids manual `createContext`+null-check boilerplate. |
| Accent via CSS `data-accent` blocks | Reuses Tailwind `--primary`/`--ring`; live-recolors whole UI; matches reference. |
| Add `motion` only now | "Install when a feature needs it" learning rule. |

---

## 4. How to run / verify

```
cd ~/Developer/keyboard/keyBr
pnpm dev        # http://localhost:3000
```

Manual smoke test:
1. Click the gear in the header → panel slides in.
2. Change accent → the UI recolors immediately.
3. Change font → the preview updates; choosing a Google font loads it.
4. Reload → accent/font persist (from `localStorage`).

Command verification (all green):
```
pnpm lint
pnpm typecheck
pnpm build
```

---

## 5. Referencing the reference

Studied for this feature:
- `zenkey/app/layout.tsx` — provider nesting.
- `zenkey/components/app-chrome.tsx` — chrome shell + internal header + panel.
- `zenkey/components/settings-context.tsx` — provider, localStorage, `settingsLoaded`.
- `zenkey/lib/settings-data.ts` — data shapes.
- `zenkey/components/settings-panel.tsx` — panel layout/styling language.
- `zenkey/app/globals.css` — `data-accent` accent blocks.

Deliberately deferred (their own future sessions): color-theme picker with API,
sound packs, keyboard styles, language picker, code modes, PWA/SW, and the
"auto-synced theme accents" in CSS.
