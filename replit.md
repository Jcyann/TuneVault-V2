# TuneVault — Old-Time Fiddle Treasury

A comprehensive, searchable treasury of Old-Time fiddle tunes for serious learners and history buffs.

## Stack

- **Frontend**: React + Vite, TypeScript, TailwindCSS, shadcn/ui, TanStack Query, Wouter
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Theme**: Warm Americana — parchment/amber light mode, charcoal/amber dark mode

## Features

- 105 traditional tunes from Appalachian, Texas, New England, Southern, and Midwestern regions
- Filter by key, region, difficulty, and text search
- Embedded YouTube videos with playback speed notes (learners can use 0.5× via gear icon)
- ABC notation display (15 tunes, sourced from TheSession.org)
- External links: Library of Congress (Henry Reed Collection), TheSession.org, Tater Joe's, Smithsonian Folkways
- Historical metadata: source fiddler, era, region, tags, performance notes

## Project Structure

```
client/src/
  App.tsx              — Routing (/, /tune/:id)
  index.css            — TailwindCSS + Americana theme CSS vars
  pages/
    HomePage.tsx       — Main browse/search page
    TuneDetailPage.tsx — Tune detail with embedded video + ABC notation
  
server/
  index.ts             — Express server entry point
  routes.ts            — API routes (/api/tunes, /api/tunes/:id, /api/keys, /api/regions, /api/stats)
  db.ts                — Drizzle ORM connection
  seed.ts              — 105-tune seed dataset

shared/
  schema.ts            — Drizzle schema: users table + tunes table
```

## API Endpoints

- `GET /api/tunes` — All tunes, filterable by `?key=`, `?region=`, `?difficulty=`, `?search=`
- `GET /api/tunes/:id` — Single tune by ID
- `GET /api/keys` — All keys with counts
- `GET /api/regions` — All regions with counts
- `GET /api/stats` — Total/video/ABC counts

## Database

PostgreSQL with two tables:
- `users` — Auth (varchar UUID primary key)
- `tunes` — Tune metadata (serial integer primary key), 24 fields

## Running

The "Start application" workflow runs `npm run dev` which starts the Express + Vite dev server on port 5000.

To reseed the database: `npx tsx server/seed.ts`
To push schema changes: `npm run db:push`
