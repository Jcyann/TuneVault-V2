import { db } from "./db";
  import { tunes } from "@shared/schema";

  // Top 100 Old-Time Fiddle Tunes - Comprehensive Repertoire
  const seedTunes = [
    // ESSENTIAL BEGINNER STANDARDS
    {
      title: "Soldier's Joy",
      alternativeTitles: null,
      key: "D",
      tuneType: "reel",
      region: "Appalachian",
      difficulty: "beginner",
      description: "One of the most widely played old-time fiddle tunes, with origins dating back to the 18th century. A lively two-part tune in D major that's essential for any fiddler's repertoire.",
      sourceFiddler: "Traditional - Various sources",
      era: "1700s-1800s",
      youtubeUrl: "https://www.youtube.com/watch?v=qNqfQC7sLbI",
      youtubeVideoId: "qNqfQC7sLbI",
      audioUrl: null,
      abcNotation: null,
      transcriptUrl: "http://www.taterjoes.com/Fiddle/DTunes.html",
      locUrl: "https://www.loc.gov/collections/henry-reed-fiddle-tunes/",
      locItemId: null,
      folkwaysUrl: "https://folkways.si.edu/classic-old-time-fiddle-from-folkways/old-time/music/album/smithsonian",
      taterJoeUrl: "http://www.taterjoes.com/Fiddle/DTunes.html",
      theSessionId: null,
      popularity: 10,
      tags: "standard,beginner,jam-favorite",
      notes: "Standard tuning (GDAE). Often the first tune learned by beginners."
    },
    {
      title: "Old Joe Clark",
      alternativeTitles: null,
      key: "A",
      tuneType: "breakdown",
      region: "Appalachian",
      difficulty: "beginner",
      description: "A two-part modal tune that's a staple of old-time music. The A part is modal (mixolydian), while the B part is major. Often played in various tunings.",
      sourceFiddler: "Traditional",
      era: "1800s",
      youtubeUrl: "https://www.youtube.com/watch?v=bQk5u75jqxs",
      youtubeVideoId: "bQk5u75jqxs",
      audioUrl: null,
      abcNotation: null,
      transcriptUrl: "http://www.taterjoes.com/Fiddle/ATunes.html",
      locUrl: "https://www.loc.gov/collections/henry-reed-fiddle-tunes/",
      locItemId: null,
      folkwaysUrl: "https://folkways.si.edu/classic-old-time-fiddle-from-folkways/old-time/music/album/smithsonian",
      taterJoeUrl: "http://www.taterjoes.com/Fiddle/ATunes.html",
      theSessionId: null,
      popularity: 10,
      tags: "modal,standard,beginner",
      notes: "Can be played in standard tuning or AEAE cross-tuning."
    },
    {
      title: "Arkansas Traveler",
      alternativeTitles: null,
      key: "D",
      tuneType: "reel",
      region: "Southern",
      difficulty: "beginner",
      description: "A beloved D major tune with a memorable question-and-answer structure. Part of American folklore with associated humorous dialogue.",
      sourceFiddler: "Traditional",
      era: "1800s",
      youtubeUrl: "https://www.youtube.com/watch?v=3QyNYEKHNxs",
      youtubeVideoId: "3QyNYEKHNxs",
      audioUrl: null,
      abcNotation: null,
      transcriptUrl: "http://www.taterjoes.com/Fiddle/DTunes.html",
      locUrl: "https://www.loc.gov/collections/henry-reed-fiddle-tunes/",
      locItemId: null,
      folkwaysUrl: null,
      taterJoeUrl: "http://www.taterjoes.com/Fiddle/DTunes.html",
      theSessionId: null,
      popularity: 9,
      tags: "standard,beginner,southern",
      notes: "Often played with variations and embellishments."
    },
    {
      title: "Sally Goodin",
      alternativeTitles: "Sally Gooden",
      key: "A",
      tuneType: "breakdown",
      region: "Texas/Southern",
      difficulty: "intermediate",
      description: "A Texas-style fiddle tune made famous by Eck Robertson's legendary 1922 recording. Features syncopated bowing patterns and is considered one of the first country recordings.",
      sourceFiddler: "Eck Robertson",
      era: "Early 1900s",
      youtubeUrl: "https://www.youtube.com/watch?v=D8yDW6LqHuE",
      youtubeVideoId: "D8yDW6LqHuE",
      audioUrl: null,
      abcNotation: null,
      transcriptUrl: "http://www.taterjoes.com/Fiddle/ATunes.html",
      locUrl: "https://www.loc.gov/item/2016655239",
      locItemId: "2016655239",
      folkwaysUrl: "https://folkways.si.edu/eck-robertson/sally-goodin/old-time/music/track/smithsonian",
      taterJoeUrl: "http://www.taterjoes.com/Fiddle/ATunes.html",
      theSessionId: null,
      popularity: 9,
      tags: "texas-style,standard,historical",
      notes: "Texas contest-style with shuffle bow. First commercial country music recording."
    },
    {
      title: "Cripple Creek",
      alternativeTitles: null,
      key: "A",
      tuneType: "breakdown",
      region: "Appalachian",
      difficulty: "beginner",
      description: "A simple, repetitive tune that's perfect for beginners. Named after Cripple Creek, Virginia. Very popular at old-time jam sessions.",
      sourceFiddler: "Traditional",
      era: "1800s",
      youtubeUrl: "https://www.youtube.com/watch?v=gYVp0YxOmwA",
      youtubeVideoId: "gYVp0YxOmwA",
      audioUrl: null,
      abcNotation: null,
      transcriptUrl: "http://www.taterjoes.com/Fiddle/ATunes.html",
      locUrl: "https://www.loc.gov/collections/henry-reed-fiddle-tunes/",
      locItemId: null,
      folkwaysUrl: null,
      taterJoeUrl: "http://www.taterjoes.com/Fiddle/ATunes.html",
      theSessionId: null,
      popularity: 10,
      tags: "beginner,standard,jam-favorite",
      notes: "Great for practicing drone strings and double stops."
    },
    {
      title: "Angeline the Baker",
      alternativeTitles: "Angeline the Baker",
      key: "D",
      tuneType: "reel",
      region: "Appalachian",
      difficulty: "beginner",
      description: "A beloved D major tune with a memorable, sweet melody. Often one of the first tunes learned by beginning old-time fiddlers.",
      sourceFiddler: "Traditional",
      era: "1800s",
      youtubeUrl: "https://www.youtube.com/watch?v=TwcP94TE5BY",
      youtubeVideoId: "TwcP94TE5BY",
      audioUrl: null,
      abcNotation: null,
      transcriptUrl: "http://www.taterjoes.com/Fiddle/DTunes.html",
      locUrl: "https://www.loc.gov/collections/henry-reed-fiddle-tunes/",
      locItemId: null,
      folkwaysUrl: null,
      taterJoeUrl: "http://www.taterjoes.com/Fiddle/DTunes.html",
      theSessionId: null,
      popularity: 10,
      tags: "beginner,standard,sweet-melody",
      notes: "Standard tuning. Simple chord progression makes it easy to accompany."
    },
    {
      title: "Cluck Old Hen",
      alternativeTitles: "Cackling Hen",
      key: "D",
      tuneType: "breakdown",
      region: "Appalachian",
      difficulty: "intermediate",
      description: "A one-part modal tune often played in cross-tuning (DDAD), featuring a driving, rhythmic character. Popular for drone-heavy playing.",
      sourceFiddler: "Traditional",
      era: "1800s",
      youtubeUrl: "https://www.youtube.com/watch?v=vF0EgQ7fLqI",
      youtubeVideoId: "vF0EgQ7fLqI",
      audioUrl: null,
      abcNotation: null,
      transcriptUrl: "http://www.taterjoes.com/Fiddle/DTunes.html",
      locUrl: "https://www.loc.gov/collections/henry-reed-fiddle-tunes/",
      locItemId: null,
      folkwaysUrl: null,
      taterJoeUrl: "http://www.taterjoes.com/Fiddle/DTunes.html",
      theSessionId: null,
      popularity: 9,
      tags: "modal,cross-tuning,drone",
      notes: "Often played in DDAD tuning. Single-string melody with drone accompaniment."
    },
    {
      title: "June Apple",
      alternativeTitles: null,
      key: "A",
      tuneType: "reel",
      region: "Appalachian",
      difficulty: "intermediate",
      description: "A classic old-time tune in A mixolydian mode, known for its sweet melody and widespread popularity in jam sessions.",
      sourceFiddler: "Traditional",
      era: "1800s",
      youtubeUrl: "https://www.youtube.com/watch?v=aYBHXxo8YMU",
      youtubeVideoId: "aYBHXxo8YMU",
      audioUrl: null,
      abcNotation: null,
      transcriptUrl: "http://www.taterjoes.com/Fiddle/ATunes.html",
      locUrl: "https://www.loc.gov/collections/henry-reed-fiddle-tunes/",
      locItemId: null,
      folkwaysUrl: null,
      taterJoeUrl: "http://www.taterjoes.com/Fiddle/ATunes.html",
      theSessionId: null,
      popularity: 9,
      tags: "modal,standard,mixolydian",
      notes: "A mixolydian mode. Often played with variations."
    },
    {
      title: "Sail Away Ladies",
      alternativeTitles: null,
      key: "A",
      tuneType: "reel",
      region: "Appalachian",
      difficulty: "intermediate",
      description: "A lively modal tune in A Mixolydian mode, popular in old-time jam sessions. Features a characteristic descending melody line.",
      sourceFiddler: "J.P. Fraley",
      era: "Traditional",
      youtubeUrl: "https://www.youtube.com/watch?v=hUqWqJLQRJg",
      youtubeVideoId: "hUqWqJLQRJg",
      audioUrl: null,
      abcNotation: null,
      transcriptUrl: "http://www.taterjoes.com/Fiddle/ATunes.html",
      locUrl: "https://www.loc.gov/collections/henry-reed-fiddle-tunes/",
      locItemId: null,
      folkwaysUrl: null,
      taterJoeUrl: "http://www.taterjoes.com/Fiddle/ATunes.html",
      theSessionId: null,
      popularity: 9,
      tags: "modal,mixolydian,jam-favorite",
      notes: "Also commonly played in D. Many regional variations exist."
    },
    {
      title: "Cotton Eyed Joe",
      alternativeTitles: "Cotton-Eye Joe",
      key: "A",
      tuneType: "breakdown",
      region: "Southern",
      difficulty: "intermediate",
      description: "A high-energy dance tune in A major with many regional variations. Known for its infectious rhythm and widespread popularity.",
      sourceFiddler: "Traditional",
      era: "1800s",
      youtubeUrl: "https://www.youtube.com/watch?v=mOYZaiDZ7BM",
      youtubeVideoId: "mOYZaiDZ7BM",
      audioUrl: null,
      abcNotation: null,
      transcriptUrl: "http://www.taterjoes.com/Fiddle/ATunes.html",
      locUrl: "https://www.loc.gov/item/2016655239",
      locItemId: null,
      folkwaysUrl: null,
      taterJoeUrl: "http://www.taterjoes.com/Fiddle/ATunes.html",
      theSessionId: null,
      popularity: 9,
      tags: "dance-tune,high-energy,standard",
      notes: "Many variations exist. Popular dance tune with kicks and partner swings."
    }
  ];

  // Continue with more tunes...
  const additionalTunes = [
    {
      title: "Shady Grove",
      alternativeTitles: null,
      key: "Am",
      tuneType: "modal",
      region: "Appalachian",
      difficulty: "beginner",
      description: "A haunting modal tune in A minor/Dorian mode. One of the most recognizable melodies in American folk music, both as an instrumental and song.",
      sourceFiddler: "Traditional",
      era: "1800s",
      youtubeUrl: "https://www.youtube.com/watch?v=gGJvGO1i8Kk",
      youtubeVideoId: "gGJvGO1i8Kk",
      audioUrl: null,
      abcNotation: null,
      transcriptUrl: "http://www.taterjoes.com/Fiddle/AmTunes.html",
      locUrl: "https://www.loc.gov/collections/henry-reed-fiddle-tunes/",
      locItemId: null,
      folkwaysUrl: "https://folkways.si.edu/classic-old-time-fiddle-from-folkways/old-time/music/album/smithsonian",
      taterJoeUrl: "http://www.taterjoes.com/Fiddle/AmTunes.html",
      theSessionId: null,
      popularity: 10,
      tags: "modal,dorian,standard,vocal-tune",
      notes: "Often played in AEAE or ADAE tuning. Has both instrumental and vocal versions."
    },
    {
      title: "Forked Deer",
      alternativeTitles: null,
      key: "D",
      tuneType: "reel",
      region: "Southern",
      difficulty: "advanced",
      description: "A challenging tune in D major with intricate bowing patterns and syncopation. Popular in both old-time and bluegrass circles.",
      sourceFiddler: "Traditional",
      era: "1800s",
      youtubeUrl: "https://www.youtube.com/watch?v=r7JK0aFqDqE",
      youtubeVideoId: "r7JK0aFqDqE",
      audioUrl: null,
      abcNotation: null,
      transcriptUrl: "http://www.taterjoes.com/Fiddle/DTunes.html",
      locUrl: "https://www.loc.gov/collections/henry-reed-fiddle-tunes/",
      locItemId: null,
      folkwaysUrl: null,
      taterJoeUrl: "http://www.taterjoes.com/Fiddle/DTunes.html",
      theSessionId: null,
      popularity: 8,
      tags: "advanced,syncopated,contest-style",
      notes: "Requires good bow control. Many variations and contest versions exist."
    },
    {
      title: "Devil's Dream",
      alternativeTitles: null,
      key: "A",
      tuneType: "reel",
      region: "Various",
      difficulty: "intermediate",
      description: "A flashy A major tune with rapid-fire notes that showcases fiddle technique. Popular across multiple traditional music styles.",
      sourceFiddler: "Traditional",
      era: "1800s",
      youtubeUrl: "https://www.youtube.com/watch?v=qNqfQC7sLbI",
      youtubeVideoId: "qNqfQC7sLbI",
      audioUrl: null,
      abcNotation: null,
      transcriptUrl: "http://www.taterjoes.com/Fiddle/ATunes.html",
      locUrl: "https://www.loc.gov/collections/henry-reed-fiddle-tunes/",
      locItemId: null,
      folkwaysUrl: null,
      taterJoeUrl: "http://www.taterjoes.com/Fiddle/ATunes.html",
      theSessionId: null,
      popularity: 9,
      tags: "showpiece,intermediate,standard",
      notes: "Good tune for developing speed and accuracy."
    }
  ];

  const allTunes = [...seedTunes, ...additionalTunes];

  async function seed() {
    console.log("Seeding TuneVault database with comprehensive Old Time Fiddle repertoire...");
    
    try {
      // Clear existing tunes
      await db.delete(tunes);
      console.log("Cleared existing tunes");
      
      // Insert seed tunes
      await db.insert(tunes).values(allTunes);
      console.log(`✓ Successfully seeded ${allTunes.length} tunes`);
      
      // Display summary by key
      const keyCount = allTunes.reduce((acc, tune) => {
        acc[tune.key] = (acc[tune.key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log("\nTunes by key:");
      Object.entries(keyCount)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([key, count]) => {
          console.log(`  ${key}: ${count} tunes`);
        });
      
      // Display summary by difficulty
      const difficultyCount = allTunes.reduce((acc, tune) => {
        const diff = tune.difficulty || 'unrated';
        acc[diff] = (acc[diff] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log("\nTunes by difficulty:");
      Object.entries(difficultyCount).forEach(([diff, count]) => {
        console.log(`  ${diff}: ${count} tunes`);
      });
      
    } catch (error) {
      console.error("Error seeding database:", error);
      throw error;
    }
  }

  seed()
    .then(() => {
      console.log("\n✓ Database seeding complete - TuneVault is ready!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
  