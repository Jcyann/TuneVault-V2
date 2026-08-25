import assert from "node:assert/strict";
import { hasExactSlipperyHillFilenameEvidence, hasTrustedPrimaryAudio } from "./slipperyHillReview";

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
assert.equal(hasTrustedPrimaryAudio("https://example.org/existing.mp3", null), true);
assert.equal(hasTrustedPrimaryAudio(null, "loc-item-123"), true);
assert.equal(hasTrustedPrimaryAudio(null, null), false);

console.log("Slippery Hill review checks passed.");