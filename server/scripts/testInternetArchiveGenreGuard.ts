import assert from "node:assert/strict";
import { disqualifyByGenre } from "./internetArchiveGenreGuard";
import { disqualifyCommonsCandidate } from "./wikimediaCommonsReview";

// Internet Archive: spoken-word/audiobook collection must be rejected even
// though the title exactly matches a same-named tune.
assert.equal(
  disqualifyByGenre({
    title: "The Green Flag and Other Stories of War and Sport",
    collection: ["librivox", "audio_bookspoetry"],
    description: "LibriVox recording of the Arthur Conan Doyle short story collection.",
  }) !== null,
  true,
);

// Self-described freeform improvisation with no traditional/folk evidence.
assert.equal(
  disqualifyByGenre({
    title: "Thunderhead",
    subject: "thunderhead; heartbeat music; bodhran105",
    description: "An inprove solo recorded live.",
  }) !== null,
  true,
);

// Declared off-genre subject tags with no traditional/folk hint.
assert.equal(
  disqualifyByGenre({
    title: "Faded Love",
    creator: "DJMARTIN",
    subject: ["electronic", "electropop", "hiphop"],
  }) !== null,
  true,
);

// Off-genre tags are excused when a traditional/folk hint is also present.
assert.equal(
  disqualifyByGenre({
    title: "Brian Boru's March",
    creator: "Celtic Influence",
    subject: ["celtic"],
  }),
  null,
);

// No red-flag pattern, but also no positive evidence it's a real musical
// performance of the named tune (e.g. an unrelated acoustic singer-songwriter
// upload that happens to share the tune's title) — must still be rejected.
assert.equal(
  disqualifyByGenre({
    title: "Faded Love",
    creator: "Michael C Schmidt",
    subject: ["acoustic", "vocal"],
    description: "Upbeat acoustic song, dark themes",
  }) !== null,
  true,
);

// A named performer/recording credit is enough positive evidence even
// without an explicit genre tag.
assert.equal(
  disqualifyByGenre({
    title: "The Foggy Dew",
    description: "Performed by Martin Brennan on flute, recorded by Christine Eddy Brennan.",
  }),
  null,
);

// A coincidentally matched item whose own TITLE happens to contain a
// traditional-sounding word ("Reel"/"March") must not be excused by that
// title alone: the title is exactly what the earlier exact-match step
// already selected on, so it is not independent evidence. An off-genre
// subject tag with no independent context must still disqualify it.
assert.equal(
  disqualifyByGenre({
    title: "Electric Reel",
    creator: "DJ Someone",
    subject: ["electronic", "techno"],
    description: "A techno banger.",
  }) !== null,
  true,
);
assert.equal(
  disqualifyByGenre({
    title: "Punk Rock March",
    subject: ["punk", "rock"],
    description: "Fast three-chord punk track.",
  }) !== null,
  true,
);
// Same title-only coincidence, but with no off-genre tag either — must
// still fail for lack of independent positive evidence.
assert.equal(
  disqualifyByGenre({
    title: "Mystery Reel",
    description: "Uploaded from a personal collection.",
  }) !== null,
  true,
);

// Wikimedia Commons: a stored tune alias colliding with an unrelated
// place-name pronunciation clip must be rejected even on an exact title
// match, because the file's own categories describe non-music content.
assert.equal(
  disqualifyCommonsCandidate({
    Categories: { value: "Dundee|GFDL|Pronunciation of names of places in Scotland" },
    ImageDescription: { value: "Pronunciation of place name \"Dundee\"." },
  }) !== null,
  true,
);

// A synthesizer-generated test file colliding with an alias must also be
// rejected.
assert.equal(
  disqualifyCommonsCandidate({
    Categories: { value: "Self-published work|Audio files of Pachelbel's Canon|Synthesizer music" },
    ImageDescription: { value: "Generated with ffmpeg for a Stack Overflow answer about audio encoding." },
  }) !== null,
  true,
);

// A genuine traditional-music recording with matching categories passes.
assert.equal(
  disqualifyCommonsCandidate({
    Categories: { value: "Irish traditional music|Fiddle recordings" },
    ImageDescription: { value: "Traditional Irish reel performed on fiddle." },
  }),
  null,
);

// ObjectName is just the matched file's own title/stem (the same string
// the exact alias match already selected on) — it must not be able to
// satisfy the positive traditional-music requirement by itself.
assert.equal(
  disqualifyCommonsCandidate({
    ObjectName: { value: "Some Reel" },
    Categories: { value: "Self-published work" },
    ImageDescription: { value: "Test recording, personal upload." },
  }) !== null,
  true,
);

console.log("Internet Archive / Wikimedia Commons genre guard checks passed.");
