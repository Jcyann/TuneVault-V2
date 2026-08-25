import assert from "node:assert/strict";
import { hasExactManifestTitleMatch, normalizeTuneTitle } from "./audioManifest";

const entry = {
  theSessionId: "123",
  title: "The Road to Reel",
  audioUrl: "https://example.org/road-to-reel.mp3",
  audioSource: "Example Archive",
  audioAttribution: "Example performer",
  description: "A documented tune description.",
  descriptionSource: "Example source",
  playingNotes: "Keep the bowing relaxed.",
};

assert.equal(normalizeTuneTitle("The Road-to Reel!"), "road to reel");
assert.equal(hasExactManifestTitleMatch(entry, ["Road to Reel", "Another Name"]), true);
assert.equal(hasExactManifestTitleMatch(entry, ["Road Reel"]), false);
assert.equal(hasExactManifestTitleMatch(entry, ["The Road to Reels"]), false);

console.log("Audio manifest matching checks passed.");