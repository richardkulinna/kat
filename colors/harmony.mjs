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
const wrapSlot = (slot) => (slot + colors.length) % colors.length;

const harmonies = {
  triad: {
    label: 'Triade',
    description: 'Drei Töne im Abstand von jeweils 120°.',
    offsets: [0, 4, 8],
    outerHalves: [0],
  },
  complementary: {
    label: 'Komplementär',
    description: 'Zwei Töne stehen einander im Farbkreis gegenüber.',
    offsets: [0, 6],
    outerHalves: [],
  },
  near: {
    label: 'Nahkomplementär',
    description: 'Zwei Töne. Das zweite Fenster liegt einen Schritt im Uhrzeigersinn neben dem Gegenpol.',
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
  const slotAngle = Math.PI / 6;
  const track = center * 0.68;
  const aperture = center * 0.145;
  const angle = (slot) => slot * slotAngle - Math.PI / 2;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(center, center);
  context.beginPath();
  context.arc(0, 0, center * 0.975, 0, Math.PI * 2);
  context.fillStyle = '#D3D3D3';
  context.fill();
  context.lineWidth = 2;
  context.strokeStyle = '#A4A4A4';
  context.stroke();

  for (const slot of allSlots) {
    const inner = slot === base ? center * 0.87 : center * 0.91;
    const outer = center * 0.935;
    const x = Math.cos(angle(slot));
    const y = Math.sin(angle(slot));
    context.beginPath();
    context.moveTo(inner * x, inner * y);
    context.lineTo(outer * x, outer * y);
    context.lineWidth = slot === base ? 5 : 2;
    context.strokeStyle = slot === base ? '#303030' : '#717171';
    context.stroke();
  }

  for (const { slot, outer } of selection) {
    const radialAngle = angle(slot);
    const start = radialAngle + (outer ? -Math.PI / 2 : Math.PI / 2);
    context.beginPath();
    context.arc(track * Math.cos(radialAngle), track * Math.sin(radialAngle), aperture, start, start + Math.PI);
    context.closePath();
    context.fillStyle = colors[slot][1];
    context.fill();
  }

  context.restore();
}

export function mountHarmonyPicker(root) {
  root.innerHTML = /* html */ `
    <div class="picker-layout">
      <figure class="picker-stage harmony-stage">
        <canvas class="harmony-disc" width="960" height="960" aria-hidden="true"></canvas>
      </figure>
      <div class="picker-controls">
        <label class="field">
          <span>Harmonie</span>
          <select data-mode>
            ${Object.entries(harmonies).map(([id, { label }]) => `<option value="${id}">${label}</option>`).join('')}
          </select>
        </label>
        <p class="harmony-rule" data-rule></p>
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
          <button type="button" data-compare>Neutral vergleichen</button>
        </div>
        <p class="harmony-note">HEX-Werte sind digitale sRGB-Annäherungen an die benannten Pigmentfarbtöne.</p>
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

  const canvas = root.querySelector('canvas');
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

  const isAnalogous = () => mode.value === 'analogous';
  const availableBases = () => isAnalogous() ? primarySlots : allSlots;
  const activeBase = () => isAnalogous() ? primaryBase : base;

  function setBase(value) {
    if (isAnalogous()) primaryBase = value;
    else base = value;
    baseSelect.value = String(value);
    render();
  }

  function updateMode() {
    baseLabel.textContent = isAnalogous() ? 'Primärfarbe' : 'Ausgangston';
    directionField.hidden = !isAnalogous();
    baseSelect.innerHTML = availableBases().map((slot) => `<option value="${slot}">${colors[slot][0]}</option>`).join('');
    baseSelect.value = String(activeBase());
    rule.textContent = harmonies[mode.value].description;
    render();
  }

  function render() {
    const selection = harmonySlots(mode.value, activeBase(), Number(direction.value));
    visibleSlots = selection.map(({ slot }) => slot);
    drawDisc(canvas, selection, activeBase());
    result.textContent = visibleSlots.map((slot) => colors[slot][0]).join(', ');
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

  mode.addEventListener('change', updateMode);
  baseSelect.addEventListener('change', () => setBase(Number(baseSelect.value)));
  direction.addEventListener('change', render);
  for (const button of root.querySelectorAll('[data-turn]')) {
    button.addEventListener('click', () => {
      const bases = availableBases();
      const index = bases.indexOf(activeBase()) + Number(button.dataset.turn);
      setBase(bases[(index + bases.length) % bases.length]);
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

  root.querySelector('[data-compare]').addEventListener('click', () => {
    compareSwatches.innerHTML = visibleSlots.map((slot) => {
      const [label, hex] = colors[slot];
      return `<li><span aria-hidden="true" style="background-color:${hex}"></span>${label}<br><code>${hex}</code></li>`;
    }).join('');
    dialog.showModal();
  });

  updateMode();
}
