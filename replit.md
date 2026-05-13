# TuneVault — Old-Time Fiddle Treasury

A comprehensive, searchable treasury of Old-Time fiddle tunes for serious learners and history buffs.
Live at **tunevault.org** · GA4: `G-ZG7NE7DJCP` · Venmo: `@Jason-Chinchen` · YouTube: `@jasonnchinchen`

## Stack

- **Frontend**: React + Vite, TypeScript, TailwindCSS, shadcn/ui, TanStack Query, Wouter
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Theme**: Warm Americana — parchment/amber + staff-line hero pattern
- **Audio**: abcjs for ABC notation rendering; MP3 playback via audio element

## Current Data

| Field | Count | Notes |
|---|---|---|
| Total tunes | 1,032 | |
| With audio | 978 | OldTimeFiddleTunes, Canote Brothers, LOC proxy, Internet Archive |
| No audio | 54 | Obscure tunes with no known recording source |
| Internet Archive recordings | 54 | Historical 78rpm + field recordings; 49 added in last enrichment session |
| With video (embeddable) | 175 | Checked via YouTube API v3; `is_embeddable` column tracks which play |
| With YouTube ID (total) | 274 | Several replaced with new embeddable alternatives |
| With ABC notation | 16 | Rendered via abcjs |
| With description | 179 | All popularity ≥ 6 tunes have descriptions; 853 default-priority tunes do not |
| With source fiddler | ~129 | |

## Features

- **1,032 tunes** — 892 from oldtimefiddletunes.net (Lamancusa), 140 hand-crafted entries
- **Multiple recordings per tune** — unified "Recorded Versions" card; clicking switches mini-player source instantly
- **Performer credits**: ~129 tunes credited — from Slippery Hill pages, filename patterns, hand-research
- **Video badge accuracy**: Only shows for confirmed-embeddable videos (`is_embeddable = true` in DB) — 175 embeddable
- **Description placeholder**: Tunes without write-ups show honest "not yet documented" message with link to suggest
- **Internet Archive audio**: 54 historical recordings sourced — 78rpm digitizations (Schroeder's Playboys, Blue Ridge Mountain Boys, Sleepy Marlin, Harold Goodfellow, Woodshed Four, etc.), Library of Congress AFC field recordings (1937–1938), and vintage studio recordings (Samantha Bumgarner 1924, Pickard Family 1929, Vernon Dalhart 1927, Eck Robinson/Richie Hass, Pete Seeger, Doc Watson, Mellie Dunham, Ralph Page, etc.)
- **Slippery Hill cleanup**: All 28 broken Slippery Hill hotlink-blocked URLs removed; 5 replaced by LOC proxy, 4 replaced by IA audio, rest rely on YouTube or LOC
- Filter by key, region, difficulty, tune type — state persisted in URL params
- Alphabetical sort when filters active; popularity sort on default browse
- Venmo tip jar (@Jason-Chinchen) in footer, with "Book a Lesson" link below it
- **5-tab NavBar**: Home, Tune of the Day, Blog, About, Lessons — active indicator on current tab
- **Blog** (`/blog`, `/blog/:slug`) — list page + full Markdown post page; "coming soon" placeholder when empty; TipJar on each page
- **Blog admin tab** — CRUD for blog posts: title, slug (auto-generated), excerpt, Markdown content, cover image, author, published/draft toggle
- **Lessons page** (`/book-a-lesson`): 4 instrument cards; CTA with "Soon" badge on booking button
- **About page** (`/about`): FAQ, usage guide, badge legend, structured suggestion/correction form
- **Tune of the Day** (`/tune-of-the-day`): Deterministic server-side date hash; "Explore another" shuffle; "Back to today's tune" button
- **Admin** (`/admin`): noindex — Lesson Inquiries, Suggestions (with apply/reject), Recordings (with Apply to Tune + Bulk Apply), YouTube sync, Blog tabs
- **Structured feedback**: `SuggestChangesForm` component on every tune page ("Suggest a correction" button → modal) and About page. Captures: tune (search), correction type (key/title/alt titles/source fiddler/description/audio URL/YouTube URL/general), suggested value, name, email, notes
- **Admin suggestion workflow**: Each structured suggestion shows correction-type badge, linked tune, suggested value; "Apply to tune" writes value directly to the tunes table; "Dismiss" marks as rejected
- **Admin recording submission workflow**: "Apply to tune" button writes YouTube ID or audioUrl to the tune record directly; "Apply all approved" bulk-applies all approved submissions at once

## SEO

- **Server-side meta injection** for all named routes: title, description, canonical, OG, Twitter, JSON-LD
- **Per-tune injection**: `Tune — Key · Type | TuneVault` title; history-based description; MusicComposition JSON-LD; tune-specific keywords
- **Homepage**: WebSite + SearchAction JSON-LD (Sitelinks Searchbox candidate); 34 keywords
- **Sitemap**: `/sitemap.xml` with 1,032 tune URLs using correct `/tune/:id` paths
- **Robots**: `/robots.txt` with Sitemap link; admin page is `noindex, nofollow`
- **Tune count**: Updated to 1,032+ everywhere

## Key Design Decisions

- **YouTube**: `sandbox` attribute removed — it was stripping browser APIs YouTube needs. Only `allow` + `referrerPolicy` kept.
- **Audio switching**: MiniPlayer effect deps include `audioUrl + locItemId` to detect same-tune source changes
- **Back button**: Uses `history.back()` instead of `<Link href="/">` to preserve URL state
- **Search state**: Synced to URL params — Back button restores filters; `hasMounted` ref prevents `setPage(1)` firing on mount
- **autoSeed**: SHA1 hash of tunes.json+recordings.json in `seed_meta` table — restarts skip 80-second sync when unchanged (~2 sec restart)
- **is_embeddable**: Stored in DB after batch YouTube API check; NOT overwritten by autoSeed upsert

## Pages

- `/` — HomePage: browse/search 1,032 tunes with filters, favorites, swipe pagination
- `/tune/:id` — TuneDetailPage: audio, video, ABC notation, sheet music, history
- `/tune-of-the-day` — TuneOfTheDayPage: daily featured tune (deterministic date hash), last 7 days list
- `/about` — AboutPage: app FAQ, how-to guide, badge explanations, Old-Time intro
- `/book-a-lesson` — BookALessonPage: lesson info page, "Coming Soon" booking button
- `/submit-recording` — SubmitRecordingPage: community recording submission form
- `/admin` — AdminPage: noindex; management tabs

## Project Structure

```
client/src/
  App.tsx              — Routing (all routes + NavBar wrapper)
  index.css            — TailwindCSS + Americana theme CSS vars
  pages/
    HomePage.tsx       — Main browse/search with URL-state filters + modern hero
    TuneDetailPage.tsx — Tune detail: YouTube, ABC notation, AudioPlayer, sidebar
    TuneOfTheDayPage.tsx — Daily featured tune
    AboutPage.tsx      — App FAQ and how-to guide
    BookALessonPage.tsx — Lesson info page
    SubmitRecordingPage.tsx — Community recording submission
  components/
    NavBar.tsx         — Fixed amber gradient navbar
    MiniPlayer.tsx     — Persistent bottom audio player (effect deps: id + audioUrl + locItemId)
    AudioPlayer.tsx    — Audio player with "Recorded by / Featuring" credits
    YoutubePlayer.tsx  — YouTube iframe; all error codes call onUnavailable()
    AbcStaffRenderer.tsx — abcjs-powered sheet music renderer
    TipJar.tsx         — Venmo tip jar

server/
  index.ts             — Express server entry point
  routes.ts            — All API routes
  seoMeta.ts           — fetchTuneForMeta(), injectTuneMeta(), injectPageMeta(), STATIC_PAGE_META
  vite.ts              — Dev server with per-route SEO injection before catch-all
  static.ts            — Prod server with per-route SEO injection
  autoSeed.ts          — Hash-based seed; creates seed_meta table; skips sync when unchanged
  db.ts                — Drizzle ORM + pg pool
  storage.ts           — IStorage interface + PostgreSQL implementation
  scripts/
    checkYoutubeEmbeddability.ts — Batch-checks all YouTube IDs via API; updates is_embeddable
    enrichFromTTA.ts             — Fetches historical descriptions from Traditional Tune Archive; writes to DB

shared/
  schema.ts            — Drizzle schema: tunes (+ is_embeddable), recordings, etc.

data/
  tunes.json           — Source of truth for tune data (snake_case fields)
  recordings.json      — Source of truth for recordings
```

## API Endpoints

- `GET /api/tunes` — Paginated tunes, filterable by `?key=`, `?region=`, `?difficulty=`, `?tuneType=`, `?search=`, `?page=`, `?limit=`
- `GET /api/tunes/:id` — Single tune by ID
- `GET /api/keys` — All keys with counts
- `GET /api/regions` — All regions with counts
- `GET /api/types` — All tune types with counts
- `GET /api/stats` — `{ total, withVideo (embeddable), withAbc, withAudio, recordingsCount }`
- `GET /api/loc-audio/:itemId` — LOC MP3 proxy
- `GET /sitemap.xml` — Full sitemap with 1,032 tune URLs
- `GET /robots.txt` — Robots with Sitemap link

## Sort Logic

- **Filters active**: alphabetical by title ASC
- **No filters**: popularity DESC, then title ASC

## Running

The "Start application" workflow runs `fuser -k 5000/tcp 2>/dev/null; npm run dev`.

To re-check YouTube embeddability: `npx tsx server/scripts/checkYoutubeEmbeddability.ts`
To enrich descriptions from TTA (dry run first): `npx tsx server/scripts/enrichFromTTA.ts --dry-run --limit=20`
To run for real: `npx tsx server/scripts/enrichFromTTA.ts`
Options: `--dry-run`, `--limit=N`, `--overwrite`, `--title="Tune Name"`
Schema changes: do NOT run `npm run db:push` — it tries to drop `seed_meta`. Use `ALTER TABLE` directly.

## Back Burner

- **AI description enrichment**: 853 tunes (all popularity=5) have no historical write-up. All popularity ≥ 6 tunes are covered. Needs OpenAI (or similar) API key + a batch script to generate and write descriptions to DB + tunes.json overnight.
- **Slug-based URLs**: `/tune/soldiers-joy` instead of `/tune/9` — significant Google SEO win; requires DB slug column, redirect strategy for existing links, and sitemap update.
- **Related Tunes**: Same-key, same-type, or commonly-played-together suggestions on each tune page — improves both UX and Google's internal link graph.
- **Setlist / practice list builder**: Save a named list of tunes, reorder, print for a jam.
- **Built-in slow-down player**: Playback speed slider on the audio player — essential for learners.
- **Re-run YouTube embeddability check periodically**: Videos get deleted/blocked over time. Script is at `server/scripts/checkYoutubeEmbeddability.ts`.
- **TheSession.org ABC import**: 35 tunes have `the_session_id` but TheSession API is currently blocking server-side requests. 20 of those are missing ABC notation.
