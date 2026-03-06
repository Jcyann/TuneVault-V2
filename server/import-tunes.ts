import { db } from "./db";
  import { tunes } from "@shared/schema";
  import { LibraryOfCongressService } from "./services/locService";
  import { TheSessionService } from "./services/sessionService";
  import { YouTubeService } from "./services/youtubeService";

  const top100Tunes = [
    { title: "Soldier's Joy", key: "D", type: "reel", difficulty: "beginner", region: "Appalachian", popularity: 10 },
    { title: "Old Joe Clark", key: "A", type: "breakdown", difficulty: "beginner", region: "Appalachian", popularity: 10 },
    { title: "Arkansas Traveler", key: "D", type: "reel", difficulty: "beginner", region: "Southern", popularity: 9 },
    { title: "Cripple Creek", key: "A", type: "breakdown", difficulty: "beginner", region: "Appalachian", popularity: 10 },
    { title: "Angeline the Baker", key: "D", type: "reel", difficulty: "beginner", region: "Appalachian", popularity: 10 },
    { title: "Sally Goodin", key: "A", type: "breakdown", difficulty: "intermediate", region: "Texas", popularity: 9 },
    { title: "Devil's Dream", key: "A", type: "reel", difficulty: "intermediate", region: "Various", popularity: 9 },
    { title: "Blackberry Blossom", key: "G", type: "reel", difficulty: "intermediate", region: "Various", popularity: 9 },
    { title: "Billy in the Low Ground", key: "D", type: "reel", difficulty: "intermediate", region: "Appalachian", popularity: 8 },
    { title: "Forked Deer", key: "D", type: "reel", difficulty: "advanced", region: "Southern", popularity: 8 },
    { title: "June Apple", key: "A", type: "reel", difficulty: "intermediate", region: "Appalachian", popularity: 9 },
    { title: "Shady Grove", key: "Am", type: "modal", difficulty: "beginner", region: "Appalachian", popularity: 10 },
    { title: "Cluck Old Hen", key: "D", type: "breakdown", difficulty: "intermediate", region: "Appalachian", popularity: 9 },
    { title: "Cotton Eyed Joe", key: "A", type: "breakdown", difficulty: "intermediate", region: "Southern", popularity: 9 },
    { title: "Sail Away Ladies", key: "A", type: "reel", difficulty: "intermediate", region: "Appalachian", popularity: 9 }
  ];

  async function importTunes() {
    console.log("Importing essential old-time fiddle tunes...");

    const locService = new LibraryOfCongressService();
    const sessionService = new TheSessionService();

    await db.delete(tunes);
    console.log("Cleared existing database");

    let imported = 0;

    for (const tuneData of top100Tunes) {
      try {
        console.log(`Processing: ${tuneData.title}`);

        const tune: any = {
          title: tuneData.title,
          key: tuneData.key,
          tuneType: tuneData.type,
          region: tuneData.region,
          difficulty: tuneData.difficulty,
          popularity: tuneData.popularity,
          sourceFiddler: "Traditional",
          era: "Traditional",
          description: `A ${tuneData.difficulty} ${tuneData.type} in ${tuneData.key}`,
          taterJoeUrl: "http://www.taterjoes.com/Fiddle/",
          locUrl: "https://www.loc.gov/collections/henry-reed-fiddle-tunes/",
          folkwaysUrl: "https://folkways.si.edu/classic-old-time-fiddle-from-folkways/"
        };

        await db.insert(tunes).values(tune);
        imported++;
        console.log(`Imported ${imported}/${top100Tunes.length}`);

      } catch (error) {
        console.error(`Error importing ${tuneData.title}`, error);
      }
    }

    console.log(`Import complete! ${imported} tunes imported.`);
  }

  importTunes()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Import failed:", error);
      process.exit(1);
    });
  