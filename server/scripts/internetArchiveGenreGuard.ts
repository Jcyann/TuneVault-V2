/**
 * Internet Archive hosts far more than traditional-music recordings under the
 * same "audio" mediatype: audiobooks (LibriVox), podcasts, spoken word, and
 * independently released music in every genre (Jamendo mirrors). An exact
 * title match against one of those is not evidence it is a recording of the
 * catalog's old-time/traditional tune — titles collide across genres and
 * media types constantly (e.g. a hip-hop/electronic track titled "Faded
 * Love", a rock single titled "The Turnpike", a LibriVox audiobook titled
 * "The Green Flag", a home "improv solo" titled "Thunderhead").
 *
 * This is a deterministic, non-editorial relevance guard (no per-tune human
 * judgment call) that rejects candidates whose own Internet Archive metadata
 * disqualifies them: declared spoken-word/audiobook collections or subjects,
 * a declared off-genre subject tag with no traditional/folk signal, or a
 * self-described freeform improvisation with no traditional/folk signal.
 * It runs alongside — not instead of — the exact title/alias, rights, and
 * playable-audio checks.
 */

const SPOKEN_WORD_RE =
  /\blibrivox\b|\baudio[- ]?books?\b|\bshort stor(?:y|ies)\b|\bnarrat(?:ed|or|ion)\b|\bread by\b|\bpodcasts?\b|\bsermons?\b|\blectures?\b|\bchapter\s*\d+\b|\bradio drama\b|\bold[- ]time radio\b|\binterviews?\b/i;

// Common transposition typo ("inprove") is folded in alongside the standard
// spellings so a single stray home-recording note can't slip through.
const IMPROV_RE = /\b(?:im|in)prov(?:e|ised|isation)?\b|\bfreeform\b/i;

const OFF_GENRE_RE =
  /\belectronic\b|\belectropop\b|\bhip-?hop\b|\brap\b|\btechno\b|\bedm\b|\bdubstep\b|\btrance\b|\bhouse music\b|\bpop\b|\bmetal\b|\bpunk\b|\br&b\b|\bsynthpop\b|\bsinger-?songwriter\b|\brock\b/i;

// Deliberately mirrors the catalog's own tune_type taxonomy (reel, jig,
// polka, march, waltz, hornpipe, barndance, slip jig, three-two, slide,
// mazurka, strathspey, breakdown) plus broader genre/region words. "acoustic"
// is intentionally excluded — it's common on unrelated singer-songwriter
// uploads and doesn't discriminate anything.
const TRADITIONAL_HINT_RE =
  /\bceltic\b|\bfolk\b|\btraditional\b|\binstrumental\b|\bbluegrass\b|\bold-?time\b|\bappalachian\b|\bamericana\b|\bfiddle\b|\birish\b|\bscottish\b|\breels?\b|\bjigs?\b|\bwaltz(?:es)?\b|\bhoedowns?\b|\bbreakdowns?\b|\btunes?\b|\bworld\b|\bmarch(?:es)?\b|\bpolkas?\b|\bhornpipes?\b|\bbarndance\b|\bmazurkas?\b|\bstrathspeys?\b|\bslides?\b/i;

// A candidate also needs some minimum positive evidence it is a documented
// musical performance rather than an untitled/self-uploaded coincidence: a
// declared traditional/genre hint (above), a description that names who
// performed or recorded it, or a recognized historical audio archive.
const PERFORMANCE_EVIDENCE_RE = /\bperformed by\b|\brecorded by\b|\bfield recording\b|\bplayed by\b/i;
const REPUTABLE_ARCHIVE_RE =
  /georgeblood|78s?\s*rpm|library of congress|\bafc\d|american folklife|smithsonian|archive of american folk song|folkways/i;

// The matched item's own *title* is what the exact-match step already
// consumed to find this candidate in the first place — it is not
// independent evidence, and a coincidentally matched item can easily have a
// title containing a traditional-sounding word (e.g. a same-named "Reel" or
// "March" that is not the catalog tune). All positive-evidence and
// off-genre/improv-override checks below must run only against metadata the
// title match did NOT already select on: description, subject, collection.
// Disqualifying (negative) signals may still look at the title too, since a
// title that self-declares an unrelated genre is still a valid reason to
// reject, it just can't be used to grant a pass.
function contextBlob(itemMetadata: Record<string, unknown>): string {
  const description = typeof itemMetadata.description === "string"
    ? itemMetadata.description.replace(/<[^>]*>/g, " ")
    : "";
  const subject = Array.isArray(itemMetadata.subject)
    ? itemMetadata.subject.join(" ")
    : typeof itemMetadata.subject === "string" ? itemMetadata.subject : "";
  const collection = Array.isArray(itemMetadata.collection)
    ? itemMetadata.collection.join(" ")
    : typeof itemMetadata.collection === "string" ? itemMetadata.collection : "";
  return [description, subject, collection].join(" ");
}

function titleText(itemMetadata: Record<string, unknown>): string {
  return typeof itemMetadata.title === "string" ? itemMetadata.title : "";
}

export function disqualifyByGenre(itemMetadata: Record<string, unknown>): string | null {
  const context = contextBlob(itemMetadata);
  const fullBlob = `${context} ${titleText(itemMetadata)}`;

  if (SPOKEN_WORD_RE.test(fullBlob)) return "spoken-word/audiobook collection, not a music recording";

  // Traditional/genre hint must come from independent context, never from
  // the matched title alone, or a coincidental "<Something> Reel"/"March"
  // title would rubber-stamp itself past the off-genre/improv/positive-
  // evidence checks below.
  const hasTraditionalHint = TRADITIONAL_HINT_RE.test(context);

  if (IMPROV_RE.test(fullBlob) && !hasTraditionalHint) {
    return "self-described freeform improvisation with no traditional/folk evidence";
  }
  if (OFF_GENRE_RE.test(fullBlob) && !hasTraditionalHint) {
    return "declared genre unrelated to traditional/folk music";
  }
  const hasPositiveEvidence = hasTraditionalHint
    || PERFORMANCE_EVIDENCE_RE.test(context)
    || REPUTABLE_ARCHIVE_RE.test(context);
  if (!hasPositiveEvidence) {
    return "no traditional/genre hint, named performer, or recognized archive evidence this is the catalog tune";
  }
  return null;
}
