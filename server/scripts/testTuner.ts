import assert from "node:assert/strict";
import {
  BANJO_TUNINGS,
  FIDDLE_TUNINGS,
  GUITAR_TUNINGS,
  TUNING_PRESETS,
  detectMonophonicPitch,
  frequencyToPitch,
  getTunerNeedleAngle,
  getPitchReading,
  midiToFrequency,
} from "../../client/src/lib/tuner";

const closeTo = (actual: number, expected: number, tolerance: number) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `Expected ${actual} to be within ${tolerance} of ${expected}`);

assert.equal(FIDDLE_TUNINGS.find((tuning) => tuning.id === "calico")?.label, "Calico · AEAC#");
assert.deepEqual(
  FIDDLE_TUNINGS.find((tuning) => tuning.id === "calico")?.strings.map((string) => string.midi),
  [57, 64, 69, 73],
);
assert.deepEqual(BANJO_TUNINGS.find((tuning) => tuning.id === "banjo-open-a")?.strings.map((string) => string.midi), [52, 57, 61, 64, 69]);
assert.equal(BANJO_TUNINGS.find((tuning) => tuning.id === "banjo-open-c")?.label, "Open C · gCGCE");
assert.equal(BANJO_TUNINGS.find((tuning) => tuning.id === "banjo-open-d")?.label, "Open D · f#DF#AD");
assert.deepEqual(GUITAR_TUNINGS.find((tuning) => tuning.id === "guitar-standard")?.strings.map((string) => string.midi), [40, 45, 50, 55, 59, 64]);

closeTo(midiToFrequency(69), 440, 0.0001);
assert.deepEqual(frequencyToPitch(440), { note: "A", midi: 69, cents: 0 });

const standard = FIDDLE_TUNINGS[0];
const aString = standard.strings.find((string) => string.id === "a")!;
assert.equal(getPitchReading(440, standard, 440, aString.id)?.status, "in-tune");
assert.equal(getPitchReading(430, standard, 440, aString.id)?.status, "flat");
assert.equal(getPitchReading(450, standard, 440, aString.id)?.status, "sharp");
assert.equal(getTunerNeedleAngle(null), null);
assert.equal(getTunerNeedleAngle(0), 0, "An in-tune string must point due north");
assert.equal(getTunerNeedleAngle(-25), -45, "Flat readings must sweep left");
assert.equal(getTunerNeedleAngle(25), 45, "Sharp readings must sweep right");
assert.equal(getTunerNeedleAngle(-100), -90, "Very flat readings must stop at the left dial limit");
assert.equal(getTunerNeedleAngle(100), 90, "Very sharp readings must stop at the right dial limit");

const sampleRate = 44_100;
const createSine = (frequency: number, length = 2048) => {
  const samples = new Float32Array(length);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
  return samples;
};
const samples = createSine(440);
const detected = detectMonophonicPitch(samples, sampleRate);
assert.ok(detected, "Expected a clean 440 Hz sine wave to be detected");
closeTo(detected.frequency, 440, 2);

const boundaryMidis = new Set<number>();
for (const tuning of TUNING_PRESETS) {
  boundaryMidis.add(Math.min(...tuning.strings.map((string) => string.midi)));
  boundaryMidis.add(Math.max(...tuning.strings.map((string) => string.midi)));
}
for (const midi of boundaryMidis) {
  const expectedFrequency = midiToFrequency(midi);
  const boundaryDetected = detectMonophonicPitch(createSine(expectedFrequency), sampleRate);
  assert.ok(boundaryDetected, `Expected ${expectedFrequency.toFixed(2)} Hz (MIDI ${midi}) to be detected`);
  const errorCents = Math.abs(1200 * Math.log2(boundaryDetected.frequency / expectedFrequency));
  assert.ok(errorCents < 8, `Expected MIDI ${midi} to be within 8 cents, got ${errorCents.toFixed(2)} cents`);
}

for (const [label, midi] of [["D2", 38], ["E2", 40], ["G3", 55], ["A4", 69]] as const) {
  const expectedFrequency = midiToFrequency(midi);
  const lowStringDetected = detectMonophonicPitch(createSine(expectedFrequency), sampleRate);
  assert.ok(lowStringDetected, `Expected ${label} to be detected from a 2048-sample buffer`);
  const errorCents = Math.abs(1200 * Math.log2(lowStringDetected.frequency / expectedFrequency));
  assert.ok(errorCents < 8, `Expected ${label} to be within 8 cents, got ${errorCents.toFixed(2)} cents`);
}

assert.equal(detectMonophonicPitch(new Float32Array(2048), sampleRate), null);

console.log("Tuner math and pitch checks passed.");