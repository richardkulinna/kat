import assert from 'node:assert/strict';
import { harmonySlots } from './harmony.mjs';

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
