// Run: node colors/sensory.test.mjs
import assert from 'node:assert/strict';
import { mountSensoryFeedback } from './sensory.mjs';

function events() {
  return {
    listeners: new Map(),
    addEventListener(type, callback, capture = false) {
      const list = this.listeners.get(type) || [];
      list.push({ callback, capture });
      this.listeners.set(type, list);
    },
    emit(type, event, change = () => {}) {
      const list = this.listeners.get(type) || [];
      list.filter(item => item.capture).forEach(item => item.callback(event));
      change();
      list.filter(item => !item.capture).forEach(item => item.callback(event));
    },
  };
}

const sound = events();
const haptics = events();
const status = {};
const settings = {
  hidden: true,
  querySelector: selector => ({
    '[data-sensory-sound]': sound,
    '[data-sensory-haptics]': haptics,
    '[data-sensory-status]': status,
  })[selector],
};
const root = { ...events(), hidden: false, querySelector: () => settings };
const calls = { contexts: 0, clicks: 0, vibrations: [], suspends: 0 };
const audioNode = () => ({
  frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
  gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
  connect() { return this; }, disconnect() {}, start() { calls.clicks++; }, stop() {},
});
globalThis.document = root;
globalThis.window = { ...events(), AudioContext: class {
  state = 'running'; currentTime = 0;
  constructor() { calls.contexts++; }
  createOscillator = audioNode;
  createGain = audioNode;
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; calls.suspends++; return Promise.resolve(); }
} };
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
  vibrate: duration => { calls.vibrations.push(duration); return true; },
} });
let time = 0;
Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => time } });
let reading = '0';
const wheel = {
  closest: selector => selector === '#harmony-picker' ? { querySelector: () => wheel }
    : selector.includes('.harmony-dial') ? wheel : null,
  getAttribute: () => reading,
};
const range = { value: '25', closest: selector => selector.includes('.free-strip') ? range : null };
const event = target => ({ target, isTrusted: true, button: 0, isPrimary: true });

mountSensoryFeedback(root);
assert.equal(settings.hidden, false);
assert.equal(sound.checked, false);
assert.equal(haptics.checked, false);
root.emit('keydown', event(wheel), () => { reading = '30'; });
assert.equal(calls.contexts, 0, 'default off must not create audio');
assert.equal(calls.clicks, 0);
sound.checked = true;
sound.emit('change', event(sound));
haptics.checked = true;
time = 100;
root.emit('keydown', event(wheel), () => { reading = '60'; });
assert.equal(calls.clicks, 1, 'keyboard detent');
assert.deepEqual(calls.vibrations, [7]);
time = 110;
root.emit('pointermove', event(wheel), () => { reading = '90'; });
assert.equal(calls.clicks, 1, 'rapid changes are throttled');
time = 200;
root.emit('pointerdown', event(range));
range.value = '26';
root.emit('input', event(range));
assert.equal(calls.clicks, 2, 'pin changes produce feedback');
time = 300;
root.emit('input', event(range));
assert.equal(calls.clicks, 2, 'unchanged value stays silent');
root.emit('keydown', { ...event(wheel), isTrusted: false }, () => { reading = '120'; });
assert.equal(calls.clicks, 2, 'synthetic events stay silent');
root.hidden = true;
root.emit('visibilitychange', {});
assert.equal(calls.suspends, 1);
assert.equal(calls.vibrations.at(-1), 0);
time = 400;
root.emit('keydown', event(wheel), () => { reading = '150'; });
assert.equal(calls.clicks, 2, 'background stays silent');
root.hidden = false;
window.AudioContext = undefined;
navigator.vibrate = undefined;
mountSensoryFeedback({ ...events(), querySelector: () => settings });
assert.equal(sound.disabled, true);
assert.equal(haptics.disabled, true);
assert.match(status.textContent, /nicht unterstützt/);
console.log('Sensory feedback: defaults, keyboard, pins, throttle, trust, background and unsupported APIs passed.');
