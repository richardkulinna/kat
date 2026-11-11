import assert from 'node:assert/strict';
import { angularDelta, harmonySlots, pointerAngle, snapDialAngle } from './harmony.mjs';

const expectedOffsets = {
  triad: [0, 4, 8],
  complementary: [0, 6],
  near: [0, 7],
  split: [0, 5, 7],
};
const slots = (mode, base, direction) => harmonySlots(mode, base, direction).map(({ slot }) => slot);

for (const [mode, offsets] of Object.entries(expectedOffsets)) {
  for (let base = 0; base < 12; base++) {
    assert.deepEqual(slots(mode, base), offsets.map((offset) => (base + offset) % 12));
  }
}

assert.deepEqual(harmonySlots('triad', 0).map(({ outer }) => outer), [true, false, false]);
assert.deepEqual(harmonySlots('split', 0).map(({ outer }) => outer), [false, false, true]);
assert.deepEqual(slots('analogous', 4, 1), [4, 5, 6, 7]); // Keyes, Fig. 2
assert.deepEqual(slots('analogous', 4, -1), [4, 3, 2, 1]);
assert.deepEqual(slots('analogous', 0, -1), [0, 11, 10, 9]);
assert.deepEqual(slots('analogous', 8, 1), [8, 9, 10, 11]);


// Pointer geometry uses clockwise angles measured from the fixed upper index.
const bounds = { left: 10, top: 20, width: 200, height: 200 };
assert.equal(pointerAngle(110, 30, bounds), 0);
assert.equal(pointerAngle(200, 120, bounds), 90);
assert.equal(pointerAngle(20, 120, bounds), -90);
assert.equal(pointerAngle(120, 120, bounds), null);
assert.equal(angularDelta(179, -179), 2);
assert.equal(angularDelta(-179, 179), -2);
assert.equal(angularDelta(359, 1), 2);
assert.equal(angularDelta(720, 45), 45);

for (const mode of Object.keys(expectedOffsets)) {
  assert.equal(snapDialAngle(374, mode), 360);
  assert.equal(snapDialAngle(376, mode), 390);
  assert.equal(snapDialAngle(-16, mode), -30);
}
assert.equal(snapDialAngle(59, 'analogous'), 0);
assert.equal(snapDialAngle(61, 'analogous'), 120);
assert.equal(snapDialAngle(299, 'analogous'), 240);
assert.equal(snapDialAngle(301, 'analogous'), 360);
assert.equal(snapDialAngle(-61, 'analogous'), -120);
