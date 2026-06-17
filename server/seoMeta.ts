import { pool } from "./db";

export interface TuneMeta {
  id: number;
  title: string;
  key: string;
  tuneType: string;
  region: string | null;
  description: string | null;
  sourceFiddler: string | null;
  era: string | null;
  audioUrl: string | null;
  locItemId: string | null;
  youtubeVideoId: string | null;
}

export async function fetchTuneForMeta(idStr: string): Promise<TuneMeta | null> {
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return null;
  const client = await pool.connect();
  try {
    const r = await client.query(
      `SELECT id, title, key, tune_type, region, description, source_fiddler, era, audio_url, loc_item_id, youtube_video_id
       FROM tunes WHERE id = $1`,
      [id]
    );
    if (!r.rows[0]) return null;
    const row = r.rows[0];
    return {
      id: row.id,
      title: row.title,
      key: row.key,
      tuneType: row.tune_type,
      region: row.region,
      description: row.description,
      sourceFiddler: row.source_fiddler,
      era: row.era,
      audioUrl: row.audio_url,
      locItemId: row.loc_item_id,
      youtubeVideoId: row.youtube_video_id,
    };
  } finally {
    client.release();
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// ─── Static page meta ────────────────────────────────────────────────────────

interface PageConfig {
  title: string;
  description: string;
  url: string;
  keywords?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const BASE = "https://tunevault.org";

export const STATIC_PAGE_META: Record<string, PageConfig> = {
  "/": {
    title: "TuneVault — Old-Time Fiddle Treasury",
    description:
      "Over 1,000 Old-Time fiddle tunes with audio recordings, historical context, ABC notation, sheet music, and YouTube performances. Searchable, filterable, free.",
    url: BASE,
    keywords:
      "old time fiddle, fiddle tunes, old time music, appalachian music, clawhammer banjo, american folk music, ABC notation fiddle, free fiddle sheet music, fiddle tune database, old time fiddle tunes list, old time fiddle songs, traditional fiddle, mountain music, string band music, fiddle breakdown, fiddle reel, fiddle jig, fiddle waltz, fiddle hornpipe, fiddle polka, learn old time fiddle, fiddle notation, Southern Appalachian fiddle, Blue Ridge fiddle, Texas fiddle, Ozark fiddle, old time jam session, fiddle tune repertoire, American folk fiddle, fiddle tab, old time music songs, fiddle music free, fiddle tune list, old time tune library",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "TuneVault",
        url: BASE,
        description:
          "The definitive online treasury of Old-Time fiddle tunes — over 1,000 tunes with audio, history, notation, and video.",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${BASE}/?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "MusicGroup",
        name: "TuneVault Old-Time Tune Library",
        url: BASE,
        genre: ["Old-Time", "Appalachian", "American Folk Music"],
        description:
          "A comprehensive library of over 1,000 Old-Time fiddle tunes including reels, breakdowns, waltzes, jigs, hornpipes, polkas, and more.",
      },
    ],
  },
  "/about": {
    title: "About TuneVault — Old-Time Fiddle Tune Library",
    description:
      "Learn about TuneVault: the largest free online treasury of Old-Time fiddle tunes, with audio recordings, staff notation, ABC, YouTube videos, and historical context for every tune.",
    url: `${BASE}/about`,
    keywords:
      "about TuneVault, old time fiddle library, fiddle tune source, fiddle tune history, old time fiddle resources, traditional American music, mountain music archive, string band repertoire, Slippery Hill fiddle, Library of Congress fiddle, old time music history, fiddle tune collection, American folk music library, old time recordings archive, fiddle notation library, O'Neill's fiddle tunes, old time fiddle community",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "About TuneVault",
      url: `${BASE}/about`,
      description:
        "TuneVault is a comprehensive online library of Old-Time fiddle tunes with audio, notation, and historical context.",
      isPartOf: { "@type": "WebSite", url: BASE, name: "TuneVault" },
    },
  },
  "/tune-of-the-day": {
    title: "Tune of the Day — Daily Old-Time Fiddle Tune | TuneVault",
    description:
      "A fresh Old-Time fiddle tune every day — listen to the audio recording, read the history, view ABC notation and sheet music, and watch a YouTube performance.",
    url: `${BASE}/tune-of-the-day`,
    keywords:
      "tune of the day fiddle, daily fiddle tune, old time tune of the day, featured fiddle tune, learn a fiddle tune, old time fiddle practice, daily old time music, fiddle tune spotlight, appalachian tune of the day, old time music daily",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Tune of the Day — TuneVault",
      url: `${BASE}/tune-of-the-day`,
      description:
        "Daily featured Old-Time fiddle tune with audio, history, notation, and video.",
      isPartOf: { "@type": "WebSite", url: BASE, name: "TuneVault" },
    },
  },
  "/book-a-lesson": {
    title: "Book a Fiddle Lesson — Private Old-Time Instruction | TuneVault",
    description:
      "Book a private Old-Time fiddle lesson with Jason Chinchen. Beginner to advanced instruction in traditional American fiddle styles — online and in-person.",
    url: `${BASE}/book-a-lesson`,
    keywords:
      "fiddle lessons, old time fiddle lessons, learn old time fiddle, private fiddle lessons, online fiddle lessons, fiddle instruction, Jason Chinchen fiddle, fiddle teacher, beginner fiddle lessons, old time fiddle teacher, learn traditional fiddle, old time music lessons, Appalachian fiddle lessons, American folk fiddle lessons, fiddle instructor online, fiddle coaching",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Private Old-Time Fiddle Lessons",
      url: `${BASE}/book-a-lesson`,
      description:
        "One-on-one Old-Time fiddle instruction for all skill levels. Online and in-person lessons available.",
      provider: {
        "@type": "Person",
        name: "Jason Chinchen",
        url: "https://www.youtube.com/@jasonnchinchen",
      },
      serviceType: "Music Instruction",
      genre: "Old-Time Fiddle",
    },
  },
  "/identify-key": {
    title: "Identify the Key — Free Fiddle Tune Key Detector | TuneVault",
    description:
      "Record or upload an Old-Time fiddle tune and detect its musical key instantly in your browser. A free key-finder tool for fiddlers and traditional musicians.",
    url: `${BASE}/identify-key`,
    keywords:
      "identify key of song, fiddle key detector, find the key of a tune, music key finder, what key is this fiddle tune, old time fiddle key, detect musical key, key detection tool, fiddle tune key finder, audio key analysis, find song key online",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "TuneVault Key Identifier",
      url: `${BASE}/identify-key`,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      description:
        "Free in-browser tool that estimates the musical key of an Old-Time fiddle tune from a recording or uploaded audio file.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      isPartOf: { "@type": "WebSite", url: BASE, name: "TuneVault" },
    },
  },
  "/submit-recording": {
    title: "Submit a Recording — Share Your Fiddle Playing | TuneVault",
    description:
      "Have a recording of an Old-Time fiddle tune? Share it with the TuneVault community. Contributions help expand the library for everyone.",
    url: `${BASE}/submit-recording`,
    keywords:
      "submit fiddle recording, share fiddle recording, contribute fiddle tune, old time fiddle recordings, upload fiddle tune, old time music contribution, fiddle community, fiddle tune archive, record old time tune, traditional fiddle recordings",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Submit a Recording — TuneVault",
      url: `${BASE}/submit-recording`,
      description:
        "Contribute your Old-Time fiddle recordings to the TuneVault library.",
      isPartOf: { "@type": "WebSite", url: BASE, name: "TuneVault" },
    },
  },
  "/admin": {
    title: "Admin | TuneVault",
    description: "TuneVault admin panel.",
    url: `${BASE}/admin`,
    noindex: true,
  },
};

export function injectPageMeta(html: string, cfg: PageConfig): string {
  const { title, description, url, keywords, noindex, jsonLd } = cfg;

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = html.replace(
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${esc(description)}"`
  );
  if (keywords) {
    html = html.replace(
      /<meta name="keywords" content="[^"]*"/,
      `<meta name="keywords" content="${esc(keywords)}"`
    );
  }
  html = html.replace(
    /<link rel="canonical" href="[^"]*"/,
    `<link rel="canonical" href="${url}"`
  );
  html = html.replace(
    /<meta property="og:title" content="[^"]*"/,
    `<meta property="og:title" content="${esc(title)}"`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*"/,
    `<meta property="og:description" content="${esc(description)}"`
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*"/,
    `<meta property="og:url" content="${url}"`
  );
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*"/,
    `<meta name="twitter:title" content="${esc(title)}"`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"/,
    `<meta name="twitter:description" content="${esc(description)}"`
  );

  if (noindex) {
    html = html.replace(
      "</head>",
      `<meta name="robots" content="noindex, nofollow">\n</head>`
    );
  }

  if (jsonLd) {
    const schemas = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
    const tags = schemas
      .map(
        (s) =>
          `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`
      )
      .join("\n");
    html = html.replace("</head>", `${tags}\n</head>`);
  }

  return html;
}

// ─── Tune page meta ───────────────────────────────────────────────────────────

export function injectTuneMeta(html: string, tune: TuneMeta): string {
  const title = `${tune.title} — Key of ${tune.key} · ${cap(tune.tuneType)} | TuneVault`;

  const rawDesc = tune.description
    ? tune.description.slice(0, 200)
    : `${tune.title}: a ${tune.key} ${tune.tuneType} from the Old-Time fiddle tradition. Audio, history, ABC notation, and video on TuneVault.`;

  const url = `${BASE}/tune/${tune.id}`;

  const regionStr = tune.region ? ` · ${tune.region}` : "";
  const prefix = `Key of ${tune.key} · ${cap(tune.tuneType)}${regionStr}. `;
  const remaining = 160 - prefix.length;
  const snippet =
    rawDesc.length > remaining
      ? rawDesc.slice(0, remaining - 1).replace(/\s\S+$/, "") + "…"
      : rawDesc;
  const truncDesc = prefix + snippet;

  // Tune-specific keywords: tune name variations + key/type/region signals
  const t = tune.title;
  const kws: string[] = [
    `${t} fiddle`,
    `${t} sheet music`,
    `${t} tab`,
    `${t} ABC notation`,
    `${t} old time`,
    `${t} fiddle tune`,
    `how to play ${t} on fiddle`,
    `${t} ${tune.tuneType}`,
    `key of ${tune.key} ${tune.tuneType}`,
    `old time ${tune.tuneType}`,
    `old time fiddle ${tune.tuneType}`,
  ];
  if (tune.region) kws.push(`${tune.region} fiddle tune`, `${tune.region} old time`);
  if (tune.sourceFiddler) kws.push(`${tune.sourceFiddler} fiddle`);
  kws.push("old time fiddle", "fiddle tunes", "appalachian fiddle", "ABC notation");
  const keywords = kws.join(", ");

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = html.replace(
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${esc(truncDesc)}"`
  );
  html = html.replace(
    /<meta name="keywords" content="[^"]*"/,
    `<meta name="keywords" content="${esc(keywords)}"`
  );
  html = html.replace(
    /<link rel="canonical" href="[^"]*"/,
    `<link rel="canonical" href="${url}"`
  );
  html = html.replace(
    /<meta property="og:title" content="[^"]*"/,
    `<meta property="og:title" content="${esc(title)}"`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*"/,
    `<meta property="og:description" content="${esc(truncDesc)}"`
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*"/,
    `<meta property="og:url" content="${url}"`
  );
  html = html.replace(
    /<meta property="og:type" content="[^"]*"/,
    `<meta property="og:type" content="music.song"`
  );
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*"/,
    `<meta name="twitter:title" content="${esc(title)}"`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"/,
    `<meta name="twitter:description" content="${esc(truncDesc)}"`
  );

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MusicComposition",
    name: tune.title,
    description: rawDesc,
    url,
    genre: [
      "Old-Time",
      cap(tune.tuneType),
      ...(tune.region ? [tune.region] : []),
    ],
    musicalKey: tune.key,
  };
  if (tune.era) jsonLd["dateCreated"] = tune.era;
  if (tune.sourceFiddler) {
    jsonLd["recordedAs"] = {
      "@type": "MusicRecording",
      byArtist: { "@type": "MusicGroup", name: tune.sourceFiddler },
    };
  }

  const ldTag = `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`;
  html = html.replace("</head>", `${ldTag}\n</head>`);

  return html;
}
