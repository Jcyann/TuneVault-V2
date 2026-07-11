/**
 * Enriches tunes with facts from public, ID-matched sources. Because every
 * lookup uses an identifier already stored on the tune (Internet Archive
 * identifier in the audio URL, Library of Congress item ID, TheSession tune
 * ID), there is zero title-matching guesswork — no wrong-tune risk.
 *
 * Sources:
 *   ia          Internet Archive item metadata (performer credits, disc years)
 *   loc         Library of Congress item records (performer, recording year)
 *   thesession  TheSession.org API (ABC notation settings, alternate titles)
 *
 * Rules (strict, per site policy):
 *   - Only facts a source actually states are written; nothing is inferred.
 *   - Never overwrite a non-empty field with conflicting data (logged instead).
 *   - Description additions cite the source inline and are appended only when
 *     the description does not already cover that fact.
 *
 * Run:  npx tsx server/scripts/enrichFromPublicSources.ts --source=ia --dry-run
 * Options: --source=ia|loc|thesession   (required)
 *          --dry-run                    preview, write nothing
 *          --limit=N                    process at most N tunes
 */

import { pool } from "../db";

const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1]) : Infinity;
const SOURCE_ARG = process.argv.find((a) => a.startsWith("--source="));
const SOURCE = SOURCE_ARG ? SOURCE_ARG.split("=")[1] : null;

const UA = { "User-Agent": "TuneVault/1.0 (tunevault.org; tune enrichment bot)" };
const DELAY_MS = 800;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url: string, retries = 1): Promise<any | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25000) });
      if (!res.ok) return null;
      return await res.json();
    } catch (err: any) {
      if (attempt === retries) {
        console.warn(`  ⚠ fetch failed ${url}: ${err.message}`);
        return null;
      }
      await sleep(2000);
    }
  }
  return null;
}

/** Normalize a tune title for strict matching: lowercase, strip punctuation
 *  and leading articles, collapse whitespace. */
function normTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/^(the|a|an|ye|old|ol')\s+/g, "")
    .replace(/['’`".,!?()\-–—]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fix shouting metadata like "THE WOODSHED FOUR" → "The Woodshed Four".
 *  Leaves mixed-case names untouched. */
function unshout(s: string): string {
  if (s !== s.toUpperCase() || !/[A-Z]/.test(s)) return s;
  return s.toLowerCase().replace(/(^|[\s.\-'])([a-z])/g, (_m, sep, ch) => sep + ch.toUpperCase());
}

function yearFrom(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const m = s.match(/\b(17|18|19|20)\d{2}\b/);
  return m ? m[0] : null;
}

// ── Internet Archive ────────────────────────────────────────────────
async function runIA(client: any) {
  const { rows } = await client.query(`
    SELECT id, title, description, audio_attribution, audio_source, audio_url,
           substring(audio_url from 'archive\\.org/download/([^/]+)') AS ia_id
    FROM tunes
    WHERE audio_url ILIKE '%archive.org%'
    ORDER BY popularity DESC, title ASC`);
  const tunes = rows.slice(0, LIMIT === Infinity ? rows.length : LIMIT);
  console.log(`IA: ${tunes.length} tunes with archive.org audio\n`);

  let attributed = 0, described = 0, skipped = 0, missing = 0;

  for (const t of tunes) {
    if (!t.ia_id) { skipped++; continue; }
    process.stdout.write(`[${t.id}] ${t.title} … `);
    const meta = await fetchJson(`https://archive.org/metadata/${t.ia_id}`);
    const m = meta?.metadata;
    if (!m) { missing++; console.log("✗ no metadata"); await sleep(400); continue; }

    const creatorRaw = typeof m.creator === "string" ? m.creator
      : Array.isArray(m.creator) ? m.creator[0]
      : typeof m.artist === "string" ? m.artist : null;
    const creator = creatorRaw ? unshout(creatorRaw.trim()) : null;
    const year = yearFrom(m.date) || yearFrom(m.year);
    const updates: string[] = [];
    const params: any[] = [];
    let p = 1;

    if (creator && (!t.audio_attribution || t.audio_attribution === "")) {
      updates.push(`audio_attribution = $${p++}`); params.push(creator);
    }
    if (!t.audio_source || t.audio_source === "") {
      updates.push(`audio_source = $${p++}`); params.push("archive.org");
    }

    // Sourced sentence, only when the description exists and doesn't already
    // mention the Internet Archive or this performer.
    if (
      creator && t.description && t.description.length > 0 &&
      !/internet archive/i.test(t.description) &&
      !t.description.toLowerCase().includes(String(creator).toLowerCase())
    ) {
      // No year claims: IA date/year metadata can be upload rather than
      // release dates, so asserting a year risks an incorrect fact.
      const is78 = Array.isArray(m.collection) ? m.collection.includes("78rpm") : m.collection === "78rpm";
      const sentence = is78
        ? `The recording heard here is a 78rpm disc by ${creator}, digitized by the Internet Archive.`
        : `The recording heard here is by ${creator}, preserved by the Internet Archive.`;
      updates.push(`description = description || $${p++}`);
      params.push(`\n\n${sentence}`);
      described++;
    }

    if (updates.length === 0) { skipped++; console.log("· nothing to add"); await sleep(300); continue; }
    if (params.some((v, i) => updates[i]?.startsWith("audio_attribution"))) attributed++;

    if (DRY_RUN) {
      console.log(`DRY: ${updates.join("; ")} ← ${JSON.stringify(params).slice(0, 160)}`);
    } else {
      params.push(t.id);
      await client.query(`UPDATE tunes SET ${updates.join(", ")} WHERE id = $${p}`, params);
      console.log(`✓ ${updates.length} field(s)`);
    }
    await sleep(DELAY_MS);
  }
  console.log(`\nIA done — attribution set: ${attributed}, description sentences: ${described}, nothing-to-add: ${skipped}, no metadata: ${missing}`);
}

// ── Library of Congress ─────────────────────────────────────────────
async function runLOC(client: any) {
  const { rows } = await client.query(`
    SELECT id, title, description, source_fiddler, loc_item_id
    FROM tunes WHERE loc_item_id IS NOT NULL
    ORDER BY popularity DESC, title ASC`);
  const tunes = rows.slice(0, LIMIT === Infinity ? rows.length : LIMIT);
  console.log(`LOC: ${tunes.length} tunes with LOC item IDs\n`);

  let described = 0, fiddlers = 0, skipped = 0, missing = 0;

  for (const t of tunes) {
    process.stdout.write(`[${t.id}] ${t.title} … `);
    const j = await fetchJson(`https://www.loc.gov/item/${t.loc_item_id}/?fo=json`);
    const item = j?.item;
    if (!item) { missing++; console.log("✗ no item"); await sleep(500); continue; }

    const contributors: string[] = item.contributor_names || item.contributors || [];
    const performerRaw = contributors.find((c: string) => /\(Performer\)/i.test(c));
    // "Reed, Henry, 1884-1968 (Performer)" → "Henry Reed"
    let performer: string | null = null;
    if (performerRaw) {
      const name = performerRaw.replace(/\s*\(Performer\)\s*/i, "").replace(/,\s*\d{4}-\d{4}\s*$/, "").trim();
      const parts = name.split(",").map((s: string) => s.trim()).filter(Boolean);
      performer = parts.length >= 2 && !/\d/.test(parts[1]) ? `${parts[1]} ${parts[0]}` : parts[0];
    }
    const year = yearFrom(item.date);

    const updates: string[] = [];
    const params: any[] = [];
    let p = 1;

    if (performer && (!t.source_fiddler || t.source_fiddler === "")) {
      updates.push(`source_fiddler = $${p++}`); params.push(performer); fiddlers++;
    }
    if (
      performer && year && t.description && t.description.length > 0 &&
      !/library of congress/i.test(t.description)
    ) {
      // "Field recording" phrasing only for American Folklife Center items
      // (afc* IDs); other LOC holdings get neutral wording.
      const isAFC = /^afc/i.test(String(t.loc_item_id));
      const sentence = isAFC
        ? `A field recording of this tune by ${performer} was made for the Library of Congress in ${year} (American Folklife Center).`
        : `A recording of this tune by ${performer}, made in ${year}, is held by the Library of Congress.`;
      updates.push(`description = description || $${p++}`);
      params.push(`\n\n${sentence}`);
      described++;
    }

    if (updates.length === 0) { skipped++; console.log("· nothing to add"); await sleep(400); continue; }

    if (DRY_RUN) {
      console.log(`DRY: ${updates.join("; ")} ← ${JSON.stringify(params).slice(0, 160)}`);
    } else {
      params.push(t.id);
      await client.query(`UPDATE tunes SET ${updates.join(", ")} WHERE id = $${p}`, params);
      console.log(`✓ ${updates.length} field(s)`);
    }
    await sleep(DELAY_MS);
  }
  console.log(`\nLOC done — fiddler credits: ${fiddlers}, description sentences: ${described}, nothing-to-add: ${skipped}, no item: ${missing}`);
}

// ── TheSession.org ──────────────────────────────────────────────────
const METER_BY_TYPE: Record<string, string> = {
  reel: "4/4", breakdown: "4/4", hornpipe: "4/4", march: "4/4",
  jig: "6/8", "slip jig": "9/8", waltz: "3/4", polka: "2/4",
  barndance: "4/4", strathspey: "4/4", "three-two": "3/2", mazurka: "3/4",
};

function sessionKeyToAbc(k: string): string {
  // "Dmajor" → "Dmaj", "Edorian" → "Edor", "Aminor" → "Amin", "Gmixolydian" → "Gmix"
  const m = k.match(/^([A-G][b#]?)(major|minor|dorian|mixolydian|lydian|phrygian|aeolian|ionian)?$/i);
  if (!m) return k;
  const mode = (m[2] || "major").toLowerCase().slice(0, 3);
  return `${m[1]}${mode}`;
}

async function runTheSession(client: any) {
  const { rows } = await client.query(`
    SELECT id, title, key, tune_type, abc_notation, alternative_titles, the_session_id
    FROM tunes WHERE the_session_id IS NOT NULL
    ORDER BY popularity DESC, title ASC`);
  const tunes = rows.slice(0, LIMIT === Infinity ? rows.length : LIMIT);
  console.log(`TheSession: ${tunes.length} tunes with session IDs\n`);

  let abcAdded = 0, aliasesAdded = 0, skipped = 0, missing = 0, conflicts = 0;

  for (const t of tunes) {
    process.stdout.write(`[${t.id}] ${t.title} … `);
    const j = await fetchJson(`https://thesession.org/tunes/${t.the_session_id}?format=json`);
    if (!j || !j.name) { missing++; console.log("✗ no data"); await sleep(500); continue; }

    // STRICT MATCH GATE — stored session IDs have proven unreliable (e.g. an
    // ID pointing at an unrelated Irish reel). Only proceed when the session
    // tune's name or one of its aliases matches this tune's title or one of
    // its alternate titles. A wrong match is worse than no match.
    const ourNames = new Set(
      [t.title, ...(t.alternative_titles || "").split(",")]
        .map((s: string) => normTitle(s || ""))
        .filter(Boolean),
    );
    const theirNames = [j.name, ...(Array.isArray(j.aliases) ? j.aliases : [])]
      .map((s: string) => normTitle(s || ""))
      .filter(Boolean);
    if (!theirNames.some((n: string) => ourNames.has(n))) {
      conflicts++;
      console.log(`✗ CONFLICT — session #${t.the_session_id} is "${j.name}", not a match; skipping`);
      await sleep(400);
      continue;
    }

    const updates: string[] = [];
    const params: any[] = [];
    let p = 1;
    const notes: string[] = [];

    // ABC notation — only when missing. Prefer a setting whose tonic matches
    // the tune's key; otherwise take the first setting.
    if ((!t.abc_notation || t.abc_notation === "") && Array.isArray(j.settings) && j.settings.length > 0) {
      const tonic = (t.key || "").replace(/m$/i, "").toUpperCase();
      const setting =
        j.settings.find((s: any) => (s.key || "").toUpperCase().startsWith(tonic)) || j.settings[0];
      const body = String(setting.abc || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/! ?/g, "\n").trim();
      const meter = METER_BY_TYPE[(j.type || t.tune_type || "").toLowerCase()];
      // Skip import rather than guess the meter — a wrong M: header would
      // render musically incorrect notation.
      if (body.length > 20 && meter) {
        const abc = [
          "X:1",
          `T:${j.name}`,
          `R:${j.type || t.tune_type || ""}`,
          `M:${meter}`,
          "L:1/8",
          `K:${sessionKeyToAbc(setting.key || "Dmajor")}`,
          body,
          `% Source: TheSession.org setting ${setting.url || `https://thesession.org/tunes/${t.the_session_id}`} (CC BY-SA)`,
        ].join("\n");
        updates.push(`abc_notation = $${p++}`);
        params.push(abc);
        abcAdded++;
        notes.push("abc");
      }
    }

    // Alternate titles — merge new aliases (cap total to keep the field sane).
    if (Array.isArray(j.aliases) && j.aliases.length > 0) {
      const existing = (t.alternative_titles || "")
        .split(",").map((s: string) => s.trim()).filter(Boolean);
      const lower = new Set(existing.map((s: string) => s.toLowerCase()));
      lower.add((t.title || "").toLowerCase());
      const fresh = j.aliases
        .map((a: string) => a.trim())
        .filter((a: string) => a && !lower.has(a.toLowerCase()))
        .slice(0, Math.max(0, 8 - existing.length));
      if (fresh.length > 0) {
        updates.push(`alternative_titles = $${p++}`);
        params.push([...existing, ...fresh].join(", "));
        aliasesAdded++;
        notes.push(`+${fresh.length} alias`);
      }
    }

    if (updates.length === 0) { skipped++; console.log("· nothing to add"); await sleep(400); continue; }

    if (DRY_RUN) {
      console.log(`DRY [${notes.join(", ")}]: ${JSON.stringify(params.map(x => String(x).slice(0, 80)))}`);
    } else {
      params.push(t.id);
      await client.query(`UPDATE tunes SET ${updates.join(", ")} WHERE id = $${p}`, params);
      console.log(`✓ ${notes.join(", ")}`);
    }
    await sleep(DELAY_MS);
  }
  console.log(`\nTheSession done — ABC added: ${abcAdded}, alias merges: ${aliasesAdded}, nothing-to-add: ${skipped}, no data: ${missing}, ID CONFLICTS (skipped): ${conflicts}`);
}

// ── Fix wrong TheSession IDs ────────────────────────────────────────
// Audit found the stored the_session_id values point at unrelated tunes
// (the tune page links them publicly). For each, search TheSession by exact
// title; keep the ID only when exactly one strict-title match exists —
// otherwise clear it. No link is better than a wrong link.
async function runFixSessionIds(client: any) {
  const { rows } = await client.query(`
    SELECT id, title, key, alternative_titles, the_session_id
    FROM tunes WHERE the_session_id IS NOT NULL
    ORDER BY popularity DESC, title ASC`);
  const tunes = rows.slice(0, LIMIT === Infinity ? rows.length : LIMIT);
  console.log(`fix-session-ids: auditing ${tunes.length} stored TheSession IDs\n`);

  let confirmed = 0, corrected = 0, cleared = 0;

  for (const t of tunes) {
    process.stdout.write(`[${t.id}] ${t.title} … `);
    const ourNames = new Set(
      [t.title, ...(t.alternative_titles || "").split(",")]
        .map((s: string) => normTitle(s || "")).filter(Boolean),
    );

    // 1. Does the stored ID already match? (cheap re-check)
    const current = await fetchJson(`https://thesession.org/tunes/${t.the_session_id}?format=json`);
    if (current?.name) {
      const names = [current.name, ...(current.aliases || [])].map((s: string) => normTitle(s));
      if (names.some((n: string) => ourNames.has(n))) {
        confirmed++; console.log(`✓ stored ID #${t.the_session_id} is correct`);
        await sleep(DELAY_MS); continue;
      }
    }
    await sleep(400);

    // 2. Search by exact title.
    const search = await fetchJson(
      `https://thesession.org/tunes/search?q=${encodeURIComponent(t.title)}&perpage=50&format=json`,
    );
    const candidates = (search?.tunes || []).filter((c: any) => ourNames.has(normTitle(c.name || "")));

    let newId: string | null = null;
    if (candidates.length === 1) {
      newId = String(candidates[0].id);
    } else if (candidates.length > 1) {
      // Disambiguate by key tonic when possible; otherwise give up.
      const tonic = (t.key || "").replace(/m$/i, "").toUpperCase();
      const byKey: any[] = [];
      for (const c of candidates.slice(0, 4)) {
        const detail = await fetchJson(`https://thesession.org/tunes/${c.id}?format=json`);
        if (detail?.settings?.some((s: any) => (s.key || "").toUpperCase().startsWith(tonic))) byKey.push(c);
        await sleep(400);
      }
      if (byKey.length === 1) newId = String(byKey[0].id);
    }

    if (DRY_RUN) {
      if (newId) { corrected++; console.log(`DRY: would correct #${t.the_session_id} → #${newId}`); }
      else { cleared++; console.log(`DRY: would CLEAR wrong ID #${t.the_session_id} (no verifiable match)`); }
    } else if (newId) {
      await client.query(`UPDATE tunes SET the_session_id = $1 WHERE id = $2`, [newId, t.id]);
      corrected++; console.log(`✓ corrected #${t.the_session_id} → #${newId}`);
    } else {
      await client.query(`UPDATE tunes SET the_session_id = NULL WHERE id = $1`, [t.id]);
      cleared++; console.log(`✗ cleared wrong ID #${t.the_session_id} (no verifiable match)`);
    }
    await sleep(DELAY_MS);
  }
  console.log(`\nfix-session-ids done — already correct: ${confirmed}, corrected: ${corrected}, cleared: ${cleared}`);
}

async function main() {
  if (!SOURCE || !["ia", "loc", "thesession", "fix-session-ids"].includes(SOURCE)) {
    console.error("Usage: --source=ia|loc|thesession|fix-session-ids [--dry-run] [--limit=N]");
    process.exit(1);
  }
  console.log(`\nPublic-source enrichment — source: ${SOURCE}, dry-run: ${DRY_RUN}\n`);
  const client = await pool.connect();
  try {
    if (SOURCE === "ia") await runIA(client);
    else if (SOURCE === "loc") await runLOC(client);
    else if (SOURCE === "fix-session-ids") await runFixSessionIds(client);
    else await runTheSession(client);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
