# TuneVault - Quick Start Guide

  ## 🚀 Getting Started

  ### 1. Set Up the Database

  Run these commands in the Shell:

  ```bash
  npm run db:push
  ```

  This will push the enhanced database schema to PostgreSQL.

  ### 2. Import the Tune Collection

  ```bash
  npm run db:import
  ```

  This will import 15+ essential old-time fiddle tunes with:
  - Metadata from external APIs
  - ABC notation from TheSession.org
  - Links to Library of Congress archives
  - YouTube video embeddings
  - Historical context and source information

  ### 3. Start the Development Server

  ```bash
  npm run dev
  ```

  Then visit the URL shown in the console!

  ---

  ## ✨ What's Been Built

  ### TuneVault Features

  ✅ **100+ Tune Framework** - Expandable collection of traditional fiddle tunes
  ✅ **External API Integration** - Library of Congress, TheSession.org, YouTube
  ✅ **Advanced Filtering** - Search by key, region, difficulty, tune type
  ✅ **ABC Notation** - Sheet music in standard ABC format
  ✅ **Video Embedding** - YouTube videos with playback speed controls
  ✅ **Historical Context** - Source fiddlers, era, regional origins
  ✅ **Difficulty Ratings** - Beginner, Intermediate, Advanced
  ✅ **Popularity Scores** - Focus on the most-played tunes
  ✅ **Beautiful UI** - Americana-themed design with amber/orange colors

  ### Database Structure

  The enhanced schema includes 20+ fields:
  - Basic info: title, key, type, region
  - Historical: sourceFiddler, era, tuning
  - Resources: youtubeVideoId, abcNotation, locItemId, theSessionId
  - External links: locUrl, taterJoeUrl, folkwaysUrl, transcriptUrl
  - Metadata: difficulty, popularity, tags, notes

  ### API Endpoints

  - `GET /api/tunes` - Get all tunes with filtering
  - `GET /api/tunes/:id` - Get single tune with full details
  - `GET /api/keys` - Get all keys with counts
  - `GET /api/regions` - Get all regions with counts
  - `GET /api/types` - Get tune types with counts
  - `GET /api/stats` - Get collection statistics

  ---

  ## 📚 Tune Collection Categories

  ### Currently Imported (15 tunes):
  - **Beginner Classics**: Soldier's Joy, Old Joe Clark, Arkansas Traveler
  - **Popular Breakdowns**: Cripple Creek, Angeline the Baker, Cluck Old Hen
  - **Intermediate Reels**: Devil's Dream, Blackberry Blossom, June Apple
  - **Regional Favorites**: Sally Goodin (Texas), Shady Grove (Appalachian)
  - **Contest Tunes**: Forked Deer, Billy in the Low Ground

  ### Ready to Expand (100+ defined):
  The import script includes definitions for:
  - 20+ Appalachian classics
  - 15+ waltzes
  - 10+ Texas contest-style tunes
  - 8+ New England favorites
  - And many more!

  ---

  ## 🔧 Optional: YouTube API

  To enable automated YouTube video search:

  1. Get a YouTube Data API key from Google Cloud Console
  2. Add it to Replit Secrets as `YOUTUBE_API_KEY`
  3. The import script will automatically search for tutorial videos

  Without the API key, you can still manually add YouTube URLs to tunes.

  ---

  ## 🎓 For Learners

  Each tune includes:
  - **Embedded video** with speed control instructions
  - **ABC notation** for sheet music
  - **Multiple source links** (LOC, TheSession, Tater Joe's)
  - **Historical provenance** and source fiddler attribution
  - **Performance notes** and tuning information
  - **Difficulty rating** to build a progression path

  ---

  ## 📖 External Resources

  ### Integrated Archives:
  - **Library of Congress** - Henry Reed Fiddle Tunes Collection
  - **TheSession.org** - 40,000+ tunes with ABC notation
  - **Tater Joe's** - Old-time fiddle transcriptions by key
  - **Smithsonian Folkways** - Classic recordings

  All links preserved to maintain scholarly attribution!

  ---

  **Built for serious learners and history buffs** 🎻
  