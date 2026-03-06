# TuneVault — Old-Time Fiddle Treasury

A comprehensive, searchable treasury of Old-Time fiddle tunes for serious learners and history buffs.

## Stack

- **Frontend**: React + Vite, TypeScript, TailwindCSS, shadcn/ui, TanStack Query, Wouter
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Theme**: Warm Americana — parchment/amber + staff-line hero pattern
- **Audio**: abcjs for ABC notation rendering; MP3 playback via audio element

## Features

- **997 tunes** — 892 from oldtimefiddletunes.net (Lamancusa), 105 hand-crafted entries
- **916 with audio** — Canote Brothers (mossyroof.com MP3s), Old Time Fiddle Tunes (oldtimefiddletunes.net MP3s), LOC proxy
- **134 with YouTube video** — embedded player (sandbox removed — was blocking playback)
- **15 with ABC notation** — rendered as sheet music via abcjs, raw text toggle
- Filter by key, region, difficulty, tune type — state persisted in URL params
- Alphabetical sort when filters active; popularity sort on default browse
- Modern "Warm Premium" UI: staff-line hero, tune-type left-border color coding, pill filter strip
- Venmo tip jar (@Jason-Chinchen) in footer

## Key Design Decisions

- **YouTube**: `sandbox` attribute removed — it was stripping browser APIs YouTube needs. Only `allow` + `referrerPolicy` kept.
- **Audio credits**: "Recorded by {audioSource} · Featuring {sourceFiddler}" in player strip
- **Search state**: Synced to URL params (`?search=&key=&tuneType=&region=&difficulty=&page=`) — Back button restores filters
- **Back button**: Uses `history.back()` instead of `<Link href="/">` to preserve URL state
- **Tune type colors**: breakdown=amber, reel=sky, waltz=violet, jig=emerald, modal=rose, polka=orange, march=indigo, hornpipe=teal

## Project Structure

```
client/src/
  App.tsx              — Routing (/, /tune/:id)
  index.css            — TailwindCSS + Americana theme CSS vars
  pages/
    HomePage.tsx       — Main browse/search with URL-state filters + modern hero
    TuneDetailPage.tsx — Tune detail: YouTube, ABC notation, AudioPlayer, sidebar
  components/
    AudioPlayer.tsx    — Audio player with "Recorded by / Featuring" credits
    AbcStaffRenderer.tsx — abcjs-powered sheet music renderer

server/
  index.ts             — Express server entry point
  routes.ts            — API routes (pagination, sort, LOC proxy, stats, types)
  db.ts                — Drizzle ORM connection
  storage.ts           — IStorage interface + PostgreSQL implementation
  import-lamancusa.ts  — One-time import script (already run — 892 tunes)

shared/
  schema.ts            — Drizzle schema: tunes table (audioSource, audioAttribution added)
```

## API Endpoints

- `GET /api/tunes` — Paginated tunes, filterable by `?key=`, `?region=`, `?difficulty=`, `?tuneType=`, `?search=`, `?page=`, `?limit=`
- `GET /api/tunes/:id` — Single tune by ID
- `GET /api/keys` — All keys with counts
- `GET /api/regions` — All regions with counts
- `GET /api/types` — All tune types with counts
- `GET /api/stats` — `{ total, withVideo, withAbc, withAudio }`
- `GET /api/loc-audio/:itemId` — LOC MP3 proxy

## Sort Logic

- **Filters active**: alphabetical by title ASC
- **No filters**: popularity DESC, then title ASC

## Running

The "Start application" workflow runs `npm run dev` which starts the Express + Vite dev server on port 5000.

To push schema changes: `npm run db:push`
