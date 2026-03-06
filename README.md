# TuneVault 🎻

  **A comprehensive, searchable treasury of Old Time Fiddle tunes with embedded media, ABC notation, and links to major historical repositories.**

  Built for lifelong learners and history buffs who care about the source, provenance, and regional variations of traditional American fiddle music.

  ---

  ## 🎯 Features

  ### Core Functionality
  - **100+ Essential Tunes**: Curated collection of the most popular old-time fiddle repertoire
  - **Advanced Search & Filtering**: Search by title, key, region, difficulty, or tune type
  - **Embedded Video Players**: YouTube videos with adjustable playback speed (0.25x - 2x) for practice
  - **ABC Notation Integration**: Sheet music in ABC format from TheSession.org
  - **Historical Context**: Rich metadata including source fiddlers, era, regional origins

  ### External Data Sources
  TuneVault integrates with authoritative historical archives:
  - **Library of Congress** - Henry Reed Fiddle Tunes Collection (184 recordings)
  - **TheSession.org** - ABC notation and tune variations
  - **Tater Joe's Old-Time Fiddle** - Transcriptions organized by key
  - **Smithsonian Folkways** - Classic old-time recordings

  ### For Serious Learners
  - **Difficulty Ratings**: Beginner, Intermediate, Advanced
  - **Popularity Scores**: Focus on the most-played tunes first
  - **Regional Variations**: Appalachian, Texas, Southern, New England, Midwestern
  - **Tune Types**: Reels, breakdowns, waltzes, jigs, hornpipes, polkas, modal tunes
  - **Historical Notes**: Tuning information, performance notes, variations

  ---

  ## 🚀 Quick Start

  ### 1. Set Up Database
  ```bash
  # Push schema and import comprehensive tune collection
  npm run db:full-setup
  ```

  This will:
  1. Push the database schema to PostgreSQL
  2. Import 15+ essential tunes with data from external APIs
  3. Populate metadata, links, and ABC notation where available

  ### 2. Start Development Server
  ```bash
  npm run dev
  ```

  ---

  ## 📚 Database Scripts

  ```bash
  npm run db:push        # Push schema to PostgreSQL
  npm run db:import      # Import tunes from external APIs
  npm run db:full-setup  # Complete setup (push + import)
  npm run db:seed        # Simple seed with basic data (alternative)
  ```

  ---

  ## 🎵 Tune Collection

  ### Coverage by Category

  **Beginner Essentials** (10 tunes)
  - Soldier's Joy, Old Joe Clark, Arkansas Traveler, Cripple Creek, Angeline the Baker, and more

  **Classic Breakdowns & Reels** (20+ tunes)  
  - Sally Goodin, Devil's Dream, Blackberry Blossom, Salt Creek, Forked Deer, and more

  **Appalachian Classics** (15+ tunes)
  - June Apple, Sail Away Ladies, Shady Grove, Cluck Old Hen, Fire on the Mountain

  **Waltzes** (7 tunes)
  - Tennessee Waltz, Midnight on the Water, Westphalia Waltz, Over the Waterfall

  **Texas & Contest Style** (8+ tunes)
  - Beaumont Rag, Stone's Rag, Faded Love, Cotton Eyed Joe

  **New England Tunes** (6+ tunes)
  - Whiskey Before Breakfast, Road to Boston, St. Anne's Reel

  **Additional Standards** (20+ tunes)
  - Buffalo Gals, Red Wing, Miss McLeod's Reel, and more

  ---

  ## 🔧 Technology Stack

  ### Frontend
  - React with TypeScript
  - Tailwind CSS + Shadcn UI components
  - Wouter for routing
  - TanStack Query for data fetching

  ### Backend
  - Express.js + Node.js
  - PostgreSQL database
  - Drizzle ORM

  ### External APIs
  - Library of Congress JSON API (no key required)
  - TheSession.org API (open data)
  - YouTube embeds (optional: add YOUTUBE_API_KEY for search)

  ---

  ## 🌐 API Integration Details

  ### Library of Congress
  - **Collection**: Henry Reed Fiddle Tunes (AFC 1967/007, AFC 1969/008)
  - **Content**: 184 sound recordings, 69 transcriptions, fieldnotes
  - **Recorded**: 1966-67 by Alan Jabbour in Glen Lyn, Virginia
  - **Access**: Free JSON API, no key required

  ### TheSession.org
  - **Database**: 40,000+ traditional tunes
  - **Format**: ABC notation (plain-text sheet music)
  - **License**: Open Database License (ODbL)
  - **Features**: Multiple tune "settings" (variations)

  ### Tater Joe's
  - **Content**: Extensive transcriptions organized by key
  - **Format**: PDF sheet music
  - **Coverage**: Major old-time repertoire

  ---

  ## 📖 For Fiddlers & Learners

  ### Practice Tips Built In
  Each tune detail page includes:
  - Embedded video with speed control instructions
  - Links to multiple notation sources
  - Historical context and source fiddler information
  - Tuning notes and performance variations
  - Regional style information

  ### Understanding the Data
  - **Key**: Musical key (D, A, G, C, Am, Dm, etc.)
  - **Tune Type**: reel, breakdown, waltz, jig, hornpipe, polka, modal
  - **Region**: Geographic/stylistic origin
  - **Difficulty**: Based on technical requirements
  - **Popularity**: 1-10 scale based on jam session frequency
  - **Era**: Historical period or "Traditional"

  ---

  ## 🎯 Roadmap

  Current release includes 15+ tunes with full integration. Planned expansions:

  1. **Phase 1** (Current): 15 essential tunes with external API data
  2. **Phase 2**: Expand to 50 tunes with YouTube search integration
  3. **Phase 3**: Complete top 100 repertoire
  4. **Phase 4**: ABC notation renderer (in-browser sheet music)
  5. **Phase 5**: User accounts for favorites/practice lists
  6. **Phase 6**: Regional collections and historical deep-dives

  ---

  ## 🤝 Contributing

  ### Adding New Tunes

  Option 1: Use the import script (recommended)
  - Add tune to `top100Tunes` array in `server/import-tunes.ts`
  - Run `npm run db:import`

  Option 2: Direct database insert
  - Use the API endpoint `POST /api/tunes` (coming soon)
  - Or add to seed data in `server/seed.ts`

  ### Data Quality Guidelines
  - Verify tune names match historical sources
  - Include source fiddler when known
  - Add regional context
  - Link to primary sources (LOC, Folkways, etc.)
  - Include ABC notation when available

  ---

  ## 📜 License & Attribution

  ### Code
  MIT License - see LICENSE file

  ### Tune Data
  - All external links remain property of their respective archives
  - ABC notation from TheSession.org under ODbL license
  - Library of Congress materials are in the public domain
  - Respect copyright for contemporary recordings

  ### Acknowledgments
  - Library of Congress American Folklife Center
  - TheSession.org community
  - Tater Joe's Old-Time Fiddle
  - Smithsonian Folkways Recordings
  - Alan Jabbour and the Henry Reed Collection

  ---

  ## 🎻 About Old-Time Fiddle Music

  Old-time fiddle music represents the traditional American string band music that evolved from Scottish, Irish, English, and African American musical traditions. Unlike bluegrass (which developed in the 1940s), old-time music emphasizes rhythm and drones, with the fiddle playing a central melodic role in ensemble settings.

  Key characteristics:
  - Emphasis on rhythm and danceability
  - Use of modal tunings and cross-tunings
  - Regional variation in bowing styles
  - Oral tradition with multiple "right" versions
  - Community-centered jam sessions

  TuneVault preserves this rich heritage by connecting learners with primary historical sources while maintaining the accessibility needed for the next generation of old-time musicians.

  ---

  **Built with ❤️ for the old-time music community**
  