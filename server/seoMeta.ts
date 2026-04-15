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
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const BASE = "https://tunevault.org";
const OG_IMAGE = `${BASE}/og-image.png`;

export const STATIC_PAGE_META: Record<string, PageConfig> = {
  "/": {
    title: "TuneVault — Old-Time Fiddle Treasury",
    description:
      "1,032+ Old-Time fiddle tunes with audio recordings, historical context, ABC notation, sheet music, and YouTube performances. Searchable, filterable, free.",
    url: BASE,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "TuneVault",
        url: BASE,
        description:
          "The definitive online treasury of Old-Time fiddle tunes — over 1,032 tunes with audio, history, notation, and video.",
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
          "A comprehensive library of over 1,032 Old-Time fiddle tunes including reels, breakdowns, waltzes, jigs, and more.",
      },
    ],
  },
  "/about": {
    title: "About TuneVault — Old-Time Fiddle Tune Library",
    description:
      "Learn about TuneVault: the largest free online treasury of Old-Time fiddle tunes, with audio recordings, staff notation, ABC, YouTube videos, and historical context for every tune.",
    url: `${BASE}/about`,
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
  "/submit-recording": {
    title: "Submit a Recording — Share Your Fiddle Playing | TuneVault",
    description:
      "Have a recording of an Old-Time fiddle tune? Share it with the TuneVault community. Contributions help expand the library for everyone.",
    url: `${BASE}/submit-recording`,
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
  const { title, description, url, noindex, jsonLd } = cfg;

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = html.replace(
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${esc(description)}"`
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

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = html.replace(
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${esc(truncDesc)}"`
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
