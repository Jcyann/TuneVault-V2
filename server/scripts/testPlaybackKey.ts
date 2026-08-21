import assert from "node:assert/strict";
import { getPlaybackKeyDetails, transposeKey } from "../../client/src/lib/playbackKey";

assert.equal(transposeKey("A Dorian", 2), "B Dorian");
assert.equal(transposeKey("Em", -1), "D#m");
assert.equal(transposeKey("Bb", 2), "C");
assert.equal(transposeKey("G Modal", -2), "F Modal");
assert.equal(transposeKey("C blues", 1), null);

assert.deepEqual(
  getPlaybackKeyDetails({
    sourceKey: "G",
    catalogKey: "D",
    source: "recording",
    semitones: 0,
  }),
  {
    label: "Recording key",
    sourceKey: "G",
    display: "G",
    catalogKey: "D",
  },
);

assert.deepEqual(
  getPlaybackKeyDetails({
    sourceKey: "A Dorian",
    catalogKey: "A Dorian",
    source: "recording",
    semitones: 1,
  }),
  {
    label: "Playback key",
    sourceKey: "A Dorian",
    display: "A Dorian → A# Dorian (+1)",
    catalogKey: null,
  },
);

console.log("Playback key display checks passed.");