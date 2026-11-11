import assert from 'node:assert/strict';
import { brandAccents, hexToRgb, hslToRgb, rgbToHex, rgbToHsl } from './color-math.mjs';

assert.deepEqual(brandAccents([350, 19.5, 42.25]), {
  candidates: [[110, 19.5, 42.25], [230, 19.5, 42.25]],
  secondary: [[20, 0, 42.25], [320, 0, 42.25], [50, 0, 42.25], [290, 0, 42.25]],
});

assert.deepEqual(brandAccents([10, 76.5, 32.25]), {
  candidates: [[130, 76.5, 32.25], [250, 76.5, 32.25]],
  secondary: [[40, 56.5, 32.25], [340, 56.5, 32.25], [70, 56.5, 32.25], [310, 56.5, 32.25]],
});

assert.deepEqual(hslToRgb([360, 100, 50]), [255, 0, 0]);
assert.deepEqual(hslToRgb([240, 100, 50]), [0, 0, 255]);
assert.deepEqual(hslToRgb([120, 100, 50]), [0, 255, 0]);
for (const hex of ['#FB0C7F', '#0C7FFB', '#F8FAFB', '#0F1728', '#000000', '#FFFFFF', '#777777']) {
  assert.equal(rgbToHex(hslToRgb(rgbToHsl(hexToRgb(hex)))), hex);
}
