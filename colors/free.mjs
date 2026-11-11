import { addPaletteColors, normalizeHex } from './palette.mjs';
import { hexToRgb, hslToRgb, rgbToHex, rgbToHsl } from './color-math.mjs';

const modes = {
  hsl: [
    ['Farbton', '°', 360, 0.1, 'Der Winkel im Farbkreis. Bei 0° und 360° liegt Rot.'],
    ['Sättigung', '%', 100, 0.1, 'Der Abstand zum Grau. Höhere Werte machen den Ton kräftiger.'],
    ['Helligkeit', '%', 100, 0.1, 'Der Weg von Schwarz über den Farbton bis Weiß.'],
  ],
  rgb: [
    ['Rot', '', 255, 1, 'Anteil des roten Lichts.'],
    ['Grün', '', 255, 1, 'Anteil des grünen Lichts.'],
    ['Blau', '', 255, 1, 'Anteil des blauen Lichts.'],
  ],
};

const format = (value) => Number(value.toFixed(2));

function stripMarkup([label, unit, max, step, help], index) {
  return `
    <div class="free-strip">
      <label class="free-strip-label" for="free-strip-${index}">${label}</label>
      <span class="free-strip-value">
        <input type="number" min="0" max="${max}" step="${step === 1 ? 1 : 'any'}"
          aria-label="${label}${unit === '°' ? ' in Grad' : unit ? ' in Prozent' : ' als Zahl'}">
        <span aria-hidden="true">${unit}</span>
      </span>
      <input id="free-strip-${index}" type="range" min="0" max="${max}" step="${step}" aria-describedby="free-help-${index}">
      <p id="free-help-${index}">${help}</p>
    </div>`;
}

function tracks(mode, hsl, rgb) {
  if (mode === 'rgb') {
    return rgb.map((_, index) => {
      const from = [...rgb];
      const to = [...rgb];
      from[index] = 0;
      to[index] = 255;
      return `linear-gradient(90deg, ${rgbToHex(from)}, ${rgbToHex(to)})`;
    });
  }

  const [hue, saturation, lightness] = hsl;
  return [
    'linear-gradient(90deg, #F00, #FF0, #0F0, #0FF, #00F, #F0F, #F00)',
    `linear-gradient(90deg, hsl(${hue} 0% ${lightness}%), hsl(${hue} 100% ${lightness}%))`,
    `linear-gradient(90deg, #000, hsl(${hue} ${saturation}% 50%), #FFF)`,
  ];
}

export function mountFreePicker(root) {
  root.innerHTML = `
    <div class="picker-layout free-layout">
      <section class="free-materials" aria-label="Farbe mischen">
        <div class="free-editor-header">
          <h2>Farbe mischen</h2>
          <fieldset class="free-mode" aria-label="Farbmodell">
            <label><input type="radio" name="free-color-mode" value="hsl" checked><span>HSL</span></label>
            <label><input type="radio" name="free-color-mode" value="rgb"><span>RGB</span></label>
          </fieldset>
        </div>
        <div class="free-strips" data-strips></div>
      </section>
      <div class="picker-controls free-result">
        <figure class="free-card">
          <div class="free-chip" data-preview aria-hidden="true"></div>
          <figcaption>Aktuelle Farbe <span data-caption></span></figcaption>
        </figure>
        <label class="field free-exact">
          <span>HEX</span>
          <input type="text" data-hex autocomplete="off" spellcheck="false" autocapitalize="off">
        </label>
        <label class="field free-exact">
          <span>HSL</span>
          <input type="text" data-hsl readonly>
        </label>
        <label class="field free-exact">
          <span>RGB</span>
          <input type="text" data-rgb readonly>
        </label>
        <div class="picker-actions">
          <button type="button" data-copy-hex>HEX kopieren</button>
          <button type="button" data-copy-rgb>RGB kopieren</button>
          <button type="button" data-add-palette>Zur Palette</button>
        </div>
        <p class="status" id="free-picker-status" role="status"></p>
      </div>
    </div>`;

  const preview = root.querySelector('[data-preview]');
  const caption = root.querySelector('[data-caption]');
  const strips = root.querySelector('[data-strips]');
  const hexField = root.querySelector('[data-hex]');
  const hslField = root.querySelector('[data-hsl]');
  const rgbField = root.querySelector('[data-rgb]');
  const copyHex = root.querySelector('[data-copy-hex]');
  const copyRgb = root.querySelector('[data-copy-rgb]');
  const addToPalette = root.querySelector('[data-add-palette]');
  const status = root.querySelector('[role="status"]');
  let rgb = hexToRgb('#0C7FFB');
  let hsl = rgbToHsl(rgb);
  let mode = 'hsl';
  let controls = [];
  let hexIsValid = true;

  function updateHexValidity(valid) {
    hexIsValid = valid;
    copyHex.disabled = !valid;
    copyRgb.disabled = !valid;
    addToPalette.disabled = !valid;
    if (valid) {
      hexField.removeAttribute('aria-invalid');
      hexField.removeAttribute('aria-describedby');
      status.textContent = '';
    }
  }

  function render(source) {
    const values = mode === 'hsl' ? hsl : rgb;
    const gradients = tracks(mode, hsl, rgb);
    controls.forEach(({ range, number }, index) => {
      const value = values[index];
      if (range !== source) range.value = value;
      if (number !== source) {
        number.value = format(value);
        number.removeAttribute('aria-invalid');
      }
      range.style.setProperty('--strip-fill', gradients[index]);
      const unit = modes[mode][index][1];
      if (unit) range.setAttribute('aria-valuetext', format(Number(range.value)) + unit);
    });

    const hex = rgbToHex(rgb);
    if (hexField !== source) hexField.value = hex;
    preview.style.backgroundColor = hex;
    caption.textContent = hex;
    const [hue, saturation, lightness] = hsl.map(format);
    hslField.value = `hsl(${hue} ${saturation}% ${lightness}%)`;
    rgbField.value = `rgb(${rgb.join(', ')})`;
  }

  function setChannel(index, input) {
    const value = input.valueAsNumber;
    if (!Number.isFinite(value) || !input.validity.valid) return;
    if (mode === 'hsl') {
      hsl[index] = value;
      rgb = hslToRgb(hsl);
    } else if (rgb[index] !== value) {
      rgb[index] = value;
      hsl = rgbToHsl(rgb);
    }
    input.removeAttribute('aria-invalid');
    updateHexValidity(true);
    render(input);
  }

  function renderEditor() {
    strips.innerHTML = modes[mode].map(stripMarkup).join('');
    controls = [...strips.children].map((strip, index) => {
      const range = strip.querySelector('input[type="range"]');
      const number = strip.querySelector('input[type="number"]');
      range.addEventListener('input', () => setChannel(index, range));
      number.addEventListener('input', () => setChannel(index, number));
      number.addEventListener('blur', () => {
        if (number.value !== '' && number.validity.valid) return;
        const values = mode === 'hsl' ? hsl : rgb;
        number.value = format(values[index]);
        status.textContent = 'Der letzte gültige Wert wurde wiederhergestellt.';
      });
      return { range, number };
    });
    render(hexIsValid ? undefined : hexField);
  }

  function updateHex(commit) {
    const value = normalizeHex(hexField.value);
    updateHexValidity(Boolean(value));
    if (value) {
      if (value !== rgbToHex(rgb)) {
        rgb = hexToRgb(value);
        hsl = rgbToHsl(rgb);
      }
      render(commit ? undefined : hexField);
    } else if (commit) {
      hexField.setAttribute('aria-invalid', 'true');
      hexField.setAttribute('aria-describedby', status.id);
      status.textContent = 'Gib 3 oder 6 Hexadezimalzeichen ein, zum Beispiel #F80 oder #FF8800.';
    }
  }

  async function copyValue(value, field) {
    const previousValue = field.value;
    try {
      await navigator.clipboard.writeText(value);
      status.textContent = value + ' kopiert.';
      return;
    } catch {
      // Select the visible value for manual copying.
    }
    if (field.value !== previousValue || !hexIsValid) return;
    field.value = value;
    field.focus();
    field.select();
    status.textContent = 'Wert markiert. Kopiere ihn manuell.';
  }

  root.querySelector('.free-mode').addEventListener('change', (event) => {
    mode = event.target.value;
    renderEditor();
  });
  hexField.addEventListener('input', () => updateHex(false));
  hexField.addEventListener('blur', () => updateHex(true));
  hexField.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') updateHex(true);
  });
  copyHex.addEventListener('click', () => copyValue(rgbToHex(rgb), hexField));
  copyRgb.addEventListener('click', () => copyValue(rgbField.value, rgbField));
  addToPalette.addEventListener('click', () => {
    status.textContent = addPaletteColors([rgbToHex(rgb)]);
  });

  renderEditor();
}
