import { addPaletteColors } from './palette.mjs';

const colors = [
  ['Rot', '#C73536'],
  ['Rotorange', '#D45430'],
  ['Orange', '#E08124'],
  ['Gelborange', '#ECB438'],
  ['Gelb', '#F1D34B'],
  ['Gelbgrün', '#9DB947'],
  ['Grün', '#477E4B'],
  ['Blaugrün', '#25877E'],
  ['Blau', '#3464AA'],
  ['Blauviolett', '#5454A2'],
  ['Violett', '#77518D'],
  ['Rotviolett', '#A64F7E'],
];

const primarySlots = [0, 4, 8];
const allSlots = colors.map((_, index) => index);
const clockwise = 1;
const slotDegrees = 360 / colors.length;
const wrap = (value, length) => ((value % length) + length) % length;
const wrapSlot = (slot) => wrap(slot, colors.length);

export function angularDelta(previous, next) {
  return wrap(next - previous + 180, 360) - 180;
}

export function snapDialAngle(angle, mode) {
  const step = slotDegrees * (mode === 'analogous' ? 4 : 1);
  return Math.round(angle / step) * step;
}

export function pointerAngle(x, y, { left, top, width, height }) {
  const dx = x - left - width / 2;
  const dy = y - top - height / 2;
  if (Math.hypot(dx, dy) < width * .1) return null;
  return Math.atan2(dx, -dy) * 180 / Math.PI;
}

const harmonies = {
  triad: {
    label: 'Triade',
    description: 'Drei gleichmäßig verteilte Töne.',
    offsets: [0, 4, 8],
    outerHalves: [0],
  },
  complementary: {
    label: 'Komplementär',
    description: 'Zwei Töne liegen einander auf der Scheibe gegenüber.',
    offsets: [0, 6],
    outerHalves: [],
  },
  near: {
    label: 'Nahkomplementär',
    description: 'Der zweite Ton liegt einen Schritt im Uhrzeigersinn neben dem Gegenpol.',
    offsets: [0, 7],
    outerHalves: [],
  },
  split: {
    label: 'Geteilt komplementär',
    description: 'Der Ausgangston und die beiden Nachbarn seines Gegenpols.',
    offsets: [0, 5, 7],
    outerHalves: [7],
  },
  analogous: {
    label: 'Analog',
    description: 'Vier benachbarte Töne. Rot, Gelb oder Blau bildet einen Endpunkt.',
    offsets: [0, 1, 2, 3],
    outerHalves: [],
  },
};

// The offsets come from Keyes's US2229025A, using clockwise 30° positions.
// In Fig. 5, near-complement uses 23 and 27. Opening 27 is opposite 24.
export function harmonySlots(mode, base, direction = clockwise) {
  const { offsets, outerHalves } = harmonies[mode];
  const step = mode === 'analogous' ? direction : clockwise;
  return offsets.map((offset) => ({
    slot: wrapSlot(base + offset * step),
    outer: outerHalves.includes(offset),
  }));
}

function drawDisc(canvas, selection, base) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const center = canvas.width / 2;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(center, center);
  context.scale(center, center);

  function circle(x, y, radius, fill) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = fill;
    context.fill();
  }

  const metal = context.createLinearGradient(-1, -1, 1, 1);
  metal.addColorStop(0, '#F1F1F1');
  metal.addColorStop(.38, '#C0C0C0');
  metal.addColorStop(.67, '#D8D8D8');
  metal.addColorStop(1, '#999');
  circle(0, 0, .98, '#4B4B4B');
  circle(0, 0, .966, metal);

  // Cut the fine grooves into the rotating rim.
  for (let mark = 0; mark < 120; mark++) {
    const angle = mark * Math.PI / 60;
    const x = Math.sin(angle);
    const y = -Math.cos(angle);
    const major = mark % 10 === 0;
    const anchor = mark === 0;
    context.beginPath();
    context.moveTo(x * (major ? .878 : .918), y * (major ? .878 : .918));
    context.lineTo(x * .954, y * .954);
    context.lineWidth = anchor ? .018 : major ? .009 : .003;
    context.strokeStyle = anchor ? '#252525' : major ? '#595959' : '#858585';
    context.stroke();
  }

  circle(0, 0, .86, '#858585');
  circle(0, 0, .85, '#CBCBCB');
  circle(0, 0, .23, '#ABABAB');
  circle(0, 0, .22, '#D8D8D8');

  for (const { slot } of selection) {
    const angle = (slot - base) * Math.PI / 6;
    const x = .61 * Math.sin(angle);
    const y = -.61 * Math.cos(angle);
    circle(x, y, .142, '#E1E1E1');
    circle(x, y, .133, '#515151');
    circle(x, y, .115, colors[slot][1]);
  }

  context.restore();
}

export function mountHarmonyPicker(root) {
  root.innerHTML = /* html */ `
    <div class="picker-layout">
      <figure class="picker-stage harmony-stage">
        <div class="harmony-dial" role="slider" tabindex="0" aria-label="Ausgangston drehen"
          aria-describedby="harmony-dial-guide" aria-valuemin="0">
          <canvas class="harmony-disc" width="960" height="960" aria-hidden="true"></canvas>
          <span class="harmony-dial-reading" data-dial-reading aria-hidden="true"></span>
        </div>
        <figcaption id="harmony-dial-guide">
          Am Rand ziehen oder Pfeiltasten nutzen. <span data-step-guide></span>
        </figcaption>
      </figure>
      <div class="picker-controls">
        <label class="field">
          <span>Harmonie</span>
          <select data-mode>
            ${Object.entries(harmonies).map(([id, { label }]) => `<option value="${id}">${label}</option>`).join('')}
          </select>
        </label>
        <p class="harmony-rule"><span data-rule></span> <strong data-offsets></strong></p>
        <label class="field">
          <span data-base-label>Ausgangston</span>
          <select data-base></select>
        </label>
        <label class="field" data-direction-field hidden>
          <span>Verlauf ab der Primärfarbe</span>
          <select data-direction>
            <option value="1">Im Uhrzeigersinn</option>
            <option value="-1">Gegen den Uhrzeigersinn</option>
          </select>
        </label>
        <div class="picker-actions harmony-turn">
          <button type="button" data-turn="-1" aria-label="Auswahl gegen den Uhrzeigersinn drehen">← Drehen</button>
          <button type="button" data-turn="1" aria-label="Auswahl im Uhrzeigersinn drehen">Drehen →</button>
        </div>
        <p class="harmony-result" data-result role="status"></p>
        <ul class="swatch-list" aria-label="Farbtöne und HEX-Werte" data-swatches></ul>
        <label class="field" data-copy-field hidden>
          <span>HEX zum manuellen Kopieren</span>
          <input type="text" data-copy-value readonly>
        </label>
        <p class="status" data-copy-status role="status"></p>
        <div class="picker-actions">
          <button type="button" data-add-palette>Harmonie zur Palette</button>
          <button type="button" data-compare>Neutral vergleichen</button>
        </div>
        <p class="harmony-note">Inspiriert von Arthur H. Keyes’ drehbaren Scheiben mit Sichtfenstern (1941). Die Farbtöne sind digitale sRGB-Annäherungen.</p>
        <p class="harmony-note">
          <a href="https://patents.google.com/patent/US2229025A/en">Keyes-Patent</a>
          <br>
          <a href="https://www2.cs.arizona.edu/patterns/weaving/periodicals/ww_03_11.pdf">Anzeige in Warp &amp; Weft</a>
        </p>
      </div>
    </div>
    <dialog class="harmony-compare" aria-labelledby="harmony-compare-title">
      <h2 id="harmony-compare-title">Neutraler Vergleich</h2>
      <ul class="harmony-compare-swatches"></ul>
      <form method="dialog"><button autofocus>Schließen</button></form>
    </dialog>
  `;

  const dial = root.querySelector('.harmony-dial');
  const canvas = dial.querySelector('canvas');
  const reading = root.querySelector('[data-dial-reading]');
  const stepGuide = root.querySelector('[data-step-guide]');
  const offsets = root.querySelector('[data-offsets]');
  const mode = root.querySelector('[data-mode]');
  const baseLabel = root.querySelector('[data-base-label]');
  const baseSelect = root.querySelector('[data-base]');
  const directionField = root.querySelector('[data-direction-field]');
  const direction = root.querySelector('[data-direction]');
  const rule = root.querySelector('[data-rule]');
  const result = root.querySelector('[data-result]');
  const swatches = root.querySelector('[data-swatches]');
  const copyField = root.querySelector('[data-copy-field]');
  const copyValue = root.querySelector('[data-copy-value]');
  const copyStatus = root.querySelector('[data-copy-status]');
  const dialog = root.querySelector('dialog');
  const compareSwatches = dialog.querySelector('ul');
  let base = 0;
  let primaryBase = 4;
  let visibleSlots = [];
  let turn = 0;
  let drag = null;

  const isAnalogous = () => mode.value === 'analogous';
  const availableBases = () => isAnalogous() ? primarySlots : allSlots;
  const activeBase = () => isAnalogous() ? primaryBase : base;

  function rotateTo(angle) {
    turn = angle;
    dial.style.setProperty('--harmony-turn', `${angle}deg`);
  }

  function setBase(value, align = true) {
    if (isAnalogous()) primaryBase = value;
    else base = value;
    baseSelect.value = String(value);
    if (align) rotateTo(turn + angularDelta(turn, value * slotDegrees));
    render();
  }

  function updateMode() {
    const step = slotDegrees * (isAnalogous() ? 4 : 1);
    baseLabel.textContent = isAnalogous() ? 'Primärfarbe' : 'Ausgangston';
    directionField.hidden = !isAnalogous();
    baseSelect.innerHTML = availableBases().map((slot) => `<option value="${slot}">${colors[slot][0]}</option>`).join('');
    dial.setAttribute('aria-valuemax', String(360 - step));
    stepGuide.textContent = `Die Scheibe rastet alle ${step}° ein.`;
    setBase(activeBase());
  }

  function turnBy(delta) {
    const target = snapDialAngle(turn, mode.value) + delta * slotDegrees * (isAnalogous() ? 4 : 1);
    rotateTo(target);
    setBase(wrapSlot(target / slotDegrees), false);
  }

  function render() {
    const selection = harmonySlots(mode.value, activeBase(), Number(direction.value));
    visibleSlots = selection.map(({ slot }) => slot);
    drawDisc(canvas, selection, activeBase());
    const degrees = activeBase() * slotDegrees;
    dial.setAttribute('aria-valuenow', String(degrees));
    dial.setAttribute('aria-valuetext', `${colors[activeBase()][0]}, ${degrees}°`);
    reading.textContent = `${degrees}°`;
    const { description, offsets: modeOffsets } = harmonies[mode.value];
    rule.textContent = description;
    const sign = isAnalogous() && Number(direction.value) < 0 ? '−' : '+';
    offsets.textContent = modeOffsets.map((offset) => offset ? `${sign}${offset * slotDegrees}°` : '0°').join(' · ');
    if (!drag) result.textContent = visibleSlots.map((slot) => colors[slot][0]).join(', ');
    swatches.innerHTML = visibleSlots.map((slot) => {
      const [label, hex] = colors[slot];
      return `
        <li>
          <button type="button" class="swatch-chip" data-copy="${hex}" aria-label="${label}, ${hex} kopieren">
            <span class="swatch-sample" aria-hidden="true" style="background-color:${hex}"></span>
            <span>${label}<br><code>${hex}</code></span>
          </button>
        </li>`;
    }).join('');
    copyField.hidden = true;
    copyStatus.textContent = '';
  }

  function trackDrag(event) {
    if (drag?.id !== event.pointerId) return;
    const angle = pointerAngle(event.clientX, event.clientY, dial.getBoundingClientRect());
    if (angle !== null && drag.angle !== null) {
      rotateTo(turn + angularDelta(drag.angle, angle));
      const next = wrapSlot(snapDialAngle(turn, mode.value) / slotDegrees);
      if (next !== activeBase()) setBase(next, false);
    }
    drag.angle = angle;
  }

  function releaseDrag() {
    const { id } = drag;
    drag = null;
    dial.classList.remove('is-dragging');
    if (dial.hasPointerCapture(id)) dial.releasePointerCapture(id);
  }

  function finishDrag(pointerId) {
    if (drag?.id !== pointerId) return;
    releaseDrag();
    const target = snapDialAngle(turn, mode.value);
    rotateTo(target);
    setBase(wrapSlot(target / slotDegrees), false);
  }

  dial.addEventListener('pointerdown', (event) => {
    if (drag || !event.isPrimary || event.button !== 0) return;
    const angle = pointerAngle(event.clientX, event.clientY, dial.getBoundingClientRect());
    if (angle === null) return;
    const transform = getComputedStyle(canvas).transform;
    if (transform !== 'none') {
      // Resume from the displayed angle if the user catches the dial during settling.
      const matrix = new DOMMatrixReadOnly(transform);
      const displayed = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
      rotateTo(turn + angularDelta(turn, displayed));
    }
    drag = { id: event.pointerId, angle };
    dial.classList.add('is-dragging');
    dial.setPointerCapture(event.pointerId);
    dial.focus({ preventScroll: true });
  });
  dial.addEventListener('pointermove', trackDrag);
  dial.addEventListener('pointerup', (event) => {
    trackDrag(event);
    finishDrag(event.pointerId);
  });
  dial.addEventListener('pointercancel', (event) => finishDrag(event.pointerId));
  dial.addEventListener('lostpointercapture', (event) => finishDrag(event.pointerId));

  dial.addEventListener('keydown', (event) => {
    const { key } = event;
    if (!['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    if (drag) finishDrag(drag.id);
    if (key === 'Home' || key === 'End') {
      const bases = availableBases();
      setBase(key === 'Home' ? bases[0] : bases[bases.length - 1]);
    } else {
      turnBy(key === 'ArrowRight' || key === 'ArrowUp' ? 1 : -1);
    }
  });

  mode.addEventListener('change', () => {
    if (drag) releaseDrag();
    updateMode();
  });
  baseSelect.addEventListener('change', () => {
    if (drag) releaseDrag();
    setBase(Number(baseSelect.value));
  });
  direction.addEventListener('change', render);
  for (const button of root.querySelectorAll('[data-turn]')) {
    button.addEventListener('click', () => {
      if (drag) finishDrag(drag.id);
      turnBy(Number(button.dataset.turn));
    });
  }

  swatches.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy]');
    if (!button) return;
    const hex = button.dataset.copy;
    try {
      await navigator.clipboard.writeText(hex);
      if (!button.isConnected) return;
      copyField.hidden = true;
      copyStatus.textContent = `${hex} kopiert.`;
    } catch {
      if (!button.isConnected) return;
      copyField.hidden = false;
      copyValue.value = hex;
      copyValue.focus();
      copyValue.select();
      copyStatus.textContent = 'Automatisches Kopieren fehlgeschlagen. Der HEX-Wert ist markiert.';
    }
  });

  root.querySelector('[data-add-palette]').addEventListener('click', () => {
    copyField.hidden = true;
    copyStatus.textContent = addPaletteColors(visibleSlots.map(slot => colors[slot][1]));
  });

  root.querySelector('[data-compare]').addEventListener('click', () => {
    compareSwatches.innerHTML = visibleSlots.map((slot) => {
      const [label, hex] = colors[slot];
      return `<li><span aria-hidden="true" style="background-color:${hex}"></span>${label}<br><code>${hex}</code></li>`;
    }).join('');
    dialog.showModal();
  });

  updateMode();
}
