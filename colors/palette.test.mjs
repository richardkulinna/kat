import assert from 'node:assert/strict';
import { contrastRatio, createPaletteStore, normalizeHex } from './palette.mjs';

assert.equal(normalizeHex(' f80 '), '#FF8800');
assert.equal(normalizeHex('#abcd'), null);
assert.equal(contrastRatio('#000000', '#FFFFFF'), 21);
assert.equal(contrastRatio('#FFFFFF', '#000000'), 21);
assert.equal(contrastRatio('#000000', '#000000'), 1);
assert.ok(contrastRatio('#767676', '#FFFFFF') >= 4.5);
assert.ok(contrastRatio('#777777', '#FFFFFF') < 4.5);
assert.ok(contrastRatio('#949494', '#FFFFFF') >= 3);
assert.ok(contrastRatio('#959595', '#FFFFFF') < 3);

let saved = '{malformed';
const storage = {
  getItem: () => saved,
  setItem: (_, value) => { saved = value; },
};
const store = createPaletteStore(() => storage);
assert.deepEqual(store.read(), { colors: [], persistent: true });
store.update(colors => [...colors, '#abc', '#AABBCC', 'wrong', 42]);
assert.deepEqual(createPaletteStore(() => storage).read().colors, ['#AABBCC']);
saved = '["#fff",null,"#ffffff","#000000"]';
store.update(colors => colors.filter(color => color !== '#000000'));
assert.deepEqual(store.read().colors, ['#FFFFFF']);

const unavailable = createPaletteStore(() => { throw new Error('Denied'); });
assert.deepEqual(unavailable.update(() => ['#000']), { colors: ['#000000'], persistent: false });
assert.deepEqual(unavailable.read().colors, ['#000000']);

const quota = createPaletteStore(() => ({
  getItem: () => '["#000"]',
  setItem: () => { throw new Error('Quota exceeded'); },
}));
assert.deepEqual(quota.update(colors => [...colors, '#fff']), {
  colors: ['#000000', '#FFFFFF'],
  persistent: false,
});
assert.deepEqual(quota.read().colors, ['#000000', '#FFFFFF']);
