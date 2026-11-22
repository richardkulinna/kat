import assert from 'node:assert/strict';
import { gridStyles, scaleSizes, trackWidth } from './values.mjs';

assert.deepEqual(scaleSizes(16, 1.25), [12.8, 16, 20, 25, 31.25, 39.06]);
assert.equal(trackWidth(1440, 12, 24, 72), 86);
assert.equal(trackWidth(240, 1, 256, 0), 240);
assert.equal(trackWidth(240, 2, 40, 100), 0);
assert.ok(trackWidth(240, 32, 256, 960) < 0);
assert.match(gridStyles(1440, 12, 24, 72), /column-gap: 1\.6666667cqw;\s*padding-inline: 5cqw;/);
