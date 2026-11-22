// Optional feedback only; color selection stays independent of browser support.
export function mountSensoryFeedback(root = document) {
  const settings = root.querySelector('[data-sensory]');
  const sound = settings.querySelector('[data-sensory-sound]');
  const haptics = settings.querySelector('[data-sensory-haptics]');
  const status = settings.querySelector('[data-sensory-status]');
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const values = new WeakMap();
  const before = new WeakMap();
  let context;
  let lastPulse = -Infinity;
  let vibrating = false;

  sound.checked = false;
  haptics.checked = false;
  sound.disabled = !AudioContext;
  haptics.disabled = typeof navigator.vibrate !== 'function';
  status.textContent = [
    sound.disabled ? 'Ton wird von diesem Browser nicht unterstützt.' : '',
    haptics.disabled ? 'Vibration wird von diesem Browser nicht unterstützt.' : '',
  ].filter(Boolean).join(' ');
  settings.hidden = false;

  function prepareAudio() {
    if (!sound.checked || document.hidden) return;
    try {
      context ||= new AudioContext();
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch {
      sound.checked = false;
      sound.disabled = true;
      status.textContent = 'Ton ist in diesem Browser nicht verfügbar.';
    }
  }

  function stop() {
    lastPulse = -Infinity;
    if (vibrating) {
      try { navigator.vibrate(0); } catch {}
      vibrating = false;
    }
    if (context?.state === 'running') context.suspend().catch(() => {});
  }

  function pulse(event) {
    if (!event.isTrusted || document.hidden || (!sound.checked && !haptics.checked)) return;
    const now = performance.now();
    if (now - lastPulse < 65) return;
    lastPulse = now;
    if (sound.checked && context?.state === 'running') {
      try {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime;
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(1000, start);
        oscillator.frequency.exponentialRampToValueAtTime(320, start + .014);
        gain.gain.setValueAtTime(.025, start);
        gain.gain.exponentialRampToValueAtTime(.0001, start + .016);
        oscillator.connect(gain).connect(context.destination);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(start);
        oscillator.stop(start + .018);
      } catch {
        // Feedback must never interrupt the picker.
      }
    }
    if (haptics.checked) {
      try { vibrating = navigator.vibrate(7); } catch {}
    }
  }

  const pin = target => target.closest('#free-picker .free-strip input[type="range"]');
  const dial = target => {
    const control = target.closest('#harmony-picker .harmony-dial, #harmony-picker [data-turn]');
    return control?.closest('#harmony-picker').querySelector('.harmony-dial');
  };

  for (const type of ['pointerdown', 'keydown']) {
    root.addEventListener(type, event => {
      if (!event.isTrusted || (type === 'pointerdown' && (event.button !== 0 || !event.isPrimary))) return;
      const range = pin(event.target);
      if (range) values.set(range, range.value);
      if (range || dial(event.target)) prepareAudio();
    }, true);
  }

  // Capture the old reading, then compare after the picker's own event handlers.
  for (const type of ['pointermove', 'pointerup', 'keydown', 'click']) {
    root.addEventListener(type, event => {
      const control = dial(event.target);
      if (control) before.set(event, control.getAttribute('aria-valuenow'));
    }, true);
    root.addEventListener(type, event => {
      const control = dial(event.target);
      if (control && before.get(event) !== control.getAttribute('aria-valuenow')) pulse(event);
    });
  }

  root.addEventListener('input', event => {
    const range = pin(event.target);
    if (!range) return;
    const previous = values.get(range);
    values.set(range, range.value);
    if (previous !== range.value) pulse(event);
  });
  sound.addEventListener('change', event => {
    if (!event.isTrusted) return;
    if (sound.checked) prepareAudio();
    else stop();
  });
  haptics.addEventListener('change', () => { if (!haptics.checked) stop(); });
  root.addEventListener('pointercancel', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('blur', stop);
  window.addEventListener('pagehide', stop);
}
