import assert from 'node:assert/strict';
import { contrastRatio, createPaletteStore, createThemeStore, defaultTheme, makeShades, normalizeHex, setThemePalette } from './palette.mjs';

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

const expectedTheme = [
  '#F8FAFB', '#0F1728', '#FB0C7F', '#0C7FFB',
  '#7D67FC', '#04DEA6', '#FBA529', '#FC4D4D',
];
assert.deepEqual(defaultTheme, expectedTheme);

const themeData = new Map();
const themeStorage = {
  getItem: key => themeData.get(key),
  setItem: (key, value) => themeData.set(key, value),
};
const themeStore = createThemeStore(() => themeStorage);
assert.deepEqual(themeStore.read().colors, expectedTheme);
const reordered = ['#fff', '#333', '#f00', '#00f', '#a0f', '#0a0', '#f80', '#f00'];
themeStore.update(() => reordered);
assert.deepEqual(createThemeStore(() => themeStorage).read().colors, reordered.map(normalizeHex));
const savedCollection = createPaletteStore(() => themeStorage);
savedCollection.update(() => ['#abc']);
assert.deepEqual(themeStore.read().colors, reordered.map(normalizeHex));
assert.deepEqual(savedCollection.read().colors, ['#AABBCC']);
themeStore.update(() => ['#aaa', '#fff']);
assert.deepEqual(themeStore.read().colors, expectedTheme);
assert.deepEqual(savedCollection.read().colors, ['#AABBCC']);

const localTheme = createThemeStore(() => { throw new Error('Denied'); });
assert.equal(localTheme.update(() => reordered).persistent, false);
assert.deepEqual(localTheme.read().colors, reordered.map(normalizeHex));

assert.equal(setThemePalette(reordered.slice(0, 7)), false);
assert.equal(setThemePalette(reordered.map((hex, index) => index === 6 ? 'invalid' : hex)), false);
assert.equal(setThemePalette(reordered), true);

for (const hex of ['#000000', '#FFFFFF', ...defaultTheme]) {
  const shades = makeShades(hex);
  assert.equal(new Set(shades).size, 6);
  assert.ok(shades.includes(hex));
  assert.ok(shades.every((color, index) => index === 0
    || contrastRatio(color, '#000000') > contrastRatio(shades[index - 1], '#000000')));
}
assert.deepEqual(makeShades('invalid'), []);
