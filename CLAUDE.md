# Qipu — working rules

Qipu is one place for the whole academic reading-writing process: discover literature → save it → read it → read fieldnotes and sources → take notes → write papers.

**Source of truth for what to build: `docs/ui-spec.md`.** Read it before any feature work. The clickable mockup is `docs/design/mockup-v3.html` (layout and flow only; the spec wins where they differ).

## The person you work with
- Anthropology PhD student, **not a developer**. Explain every terminal, git, Supabase or config step one at a time, and say what each command does.
- Mac, Apple Silicon.
- Writes in Spanish or English. **Always reply in the language of their last message.**
- Work in **small steps**. Show the plan before big changes. **Ask when a decision is theirs** (product, UX, data, cost, privacy).

## Branches and deploys
- Work on `develop` (Netlify staging). **Never merge to `main` (production) unless they explicitly say so.**
- Before every commit run `npm run check` (lint + typecheck + build). The GitHub check runs the same, plus the migrations.

## Stack
- Next.js 16 (App Router), React 19, TypeScript, Tailwind 3, Supabase (Postgres + auth), Google OAuth, Google Drive API, Netlify. Node 22 (`.nvmrc`).
- Versions are pinned exactly in `package.json`. Upgrade on purpose, never with `--force` or `legacy-peer-deps`.
- Next 16 conventions: `src/proxy.ts` (not `middleware.ts`); lint runs `eslint .` with `eslint.config.mjs`.

## Code rules
- **Colors and design tokens come from `src/lib/tokens.ts`. Never hardcode colors.**
- **Every UI string goes through `src/messages/es.json` and `en.json`.** Spanish and English from the start.
- **Data layer:** screens never call Supabase or Google Drive directly. They go through one data layer (e.g. `saveNote`, `loadAnnotations`, `storeFile`). This keeps a future offline desktop version possible.
- **App logic runs in the browser.** Server code (route handlers) only for small jobs that need secrets, such as refreshing Google tokens.
- IDs are UUIDs. Notes are plain Markdown. PDF display, highlighting and export happen in the browser.
- Text items only for now (PDF and pasted text). Don't build images/video/audio yet, but don't block them.

## Database
- Migrations live in `supabase/migrations/`, applied with the Supabase CLI. **Never edit a migration that has been applied anywhere**; add a new one.
- **For now there is one Supabase project** (ref `otbpolbikpylzjbosjgc`), shared by `develop` and `main`: the free plan's two-project limit is used up. It holds no real data yet. Until a separate staging database exists, every migration must pass the GitHub check and be shown to the user before it is applied.
- **Must-do before Qipu holds real research data:** set up a separate staging database (Supabase Pro, or a local Supabase), and point `develop` at it.
- Row-level security on every table; join tables check ownership of **both** sides.
- TypeScript database types are generated from the database, not written by hand.
- Interview data: aliases only, never real names.

## Never
- Commit secrets (`.env*`, keys, tokens).
- Delete a user's Google Drive files unless they explicitly ask.
- Copy code from Zotero's translators (AGPL licence).
