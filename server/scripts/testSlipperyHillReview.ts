import assert from "node:assert/strict";
import {
  hasExactSlipperyHillFilenameEvidence,
  hasExactSlipperyHillPageEvidence,
  hasTrustedPrimaryAudio,
} from "./slipperyHillReview";

const base = "https://www.slippery-hill.com/system/files/recordings/";

assert.equal(
  hasExactSlipperyHillFilenameEvidence(`${base}policeman.mp3`, ["Policeman"], "policeman.mp3"),
  true,
);
assert.equal(
  hasExactSlipperyHillFilenameEvidence(`${base}brushy_fork_of_johns_creek.mp3`, ["Brushy Fork of John's Creek"], "brushy_fork_of_johns_creek.mp3"),
  true,
);
assert.equal(
  hasExactSlipperyHillFilenameEvidence(`${base}unrelated.mp3`, ["Policeman"], "unrelated.mp3"),
  false,
);
assert.equal(
  hasExactSlipperyHillFilenameEvidence(`${base}policeman.mp3`, ["Policeman"], "wrong.mp3"),
  false,
);
assert.equal(
  hasExactSlipperyHillPageEvidence(
    "https://www.slippery-hill.com/content/falls-richmond-0",
    "Falls Of Richmond",
    ["Falls of Richmond"],
  ),
  true,
);
assert.equal(
  hasExactSlipperyHillPageEvidence(
    "https://www.slippery-hill.com/content/fall-my-knees",
    "Fall On My Knees",
    ["Fall on My Knees"],
  ),
  true,
);
assert.equal(
  hasExactSlipperyHillPageEvidence(
    "https://www.slippery-hill.com/content/unrelated-tune",
    "Policeman",
    ["Policeman"],
  ),
  false,
);
assert.equal(
  hasExactSlipperyHillPageEvidence(
    "https://www.slippery-hill.com/content/fiddlers-tune",
    "Fiddler's Tune",
    ["Old Fiddler's Tune"],
  ),
  false,
);
assert.equal(
  hasExactSlipperyHillPageEvidence(
    "https://www.slippery-hill.com/content/bentons-dream",
    "Benton&#039;s Dream",
    ["Benton's Dream"],
  ),
  true,
);
assert.equal(hasTrustedPrimaryAudio("https://example.org/existing.mp3", null), true);
assert.equal(hasTrustedPrimaryAudio(null, "loc-item-123"), true);
assert.equal(hasTrustedPrimaryAudio(null, null), false);

console.log("Slippery Hill review checks passed.");