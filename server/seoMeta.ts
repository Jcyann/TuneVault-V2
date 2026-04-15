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

export function injectTuneMeta(html: string, tune: TuneMeta): string {
  const title = `${tune.title} — Key of ${tune.key} · ${cap(tune.tuneType)} | TuneVault`;

  const rawDesc = tune.description
    ? tune.description.slice(0, 200)
    : `${tune.title}: a ${tune.key} ${tune.tuneType} from the Old-Time fiddle tradition. Audio, history, ABC notation, and video on TuneVault.`;

  const url = `https://tunevault.org/tune/${tune.id}`;

  // Build a clean meta description: key facts first, then history snippet
  const regionStr = tune.region ? ` · ${tune.region}` : "";
  const prefix = `Key of ${tune.key} · ${cap(tune.tuneType)}${regionStr}. `;
  const remaining = 160 - prefix.length;
  const snippet = rawDesc.length > remaining
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
    "name": tune.title,
    "description": rawDesc,
    "url": url,
    "genre": ["Old-Time", cap(tune.tuneType), ...(tune.region ? [tune.region] : [])],
    "musicalKey": tune.key,
  };
  if (tune.era) jsonLd["dateCreated"] = tune.era;
  if (tune.sourceFiddler) {
    jsonLd["recordedAs"] = {
      "@type": "MusicRecording",
      "byArtist": { "@type": "MusicGroup", "name": tune.sourceFiddler },
    };
  }

  const ldTag = `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`;
  html = html.replace("</head>", `${ldTag}\n</head>`);

  return html;
}
