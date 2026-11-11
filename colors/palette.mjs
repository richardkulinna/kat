export function normalizeHex(value) {
  if (typeof value !== 'string') return null;
  const digits = value.trim().replace(/^#/, '');
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(digits)) return null;
  const full = digits.length === 3
    ? [...digits].map(digit => digit.repeat(2)).join('')
    : digits;
  return '#' + full.toUpperCase();
}

function luminance(hex) {
  const [red, green, blue] = hex.slice(1).match(/../g).map(pair => {
    const value = Number.parseInt(pair, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(foreground, background) {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const storageKey = 'kat-colors-palette-v1';

function uniqueColors(values) {
  return [...new Set(values.map(normalizeHex).filter(Boolean))];
}

export function createPaletteStore(getStorage) {
  let colors = [];
  let persistent = true;

  function read() {
    if (persistent) {
      try {
        const raw = getStorage().getItem(storageKey);
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = null;
        }
        colors = Array.isArray(parsed) ? uniqueColors(parsed) : [];
      } catch {
        persistent = false;
      }
    }
    return { colors, persistent };
  }

  function update(transform) {
    const previous = read().colors;
    colors = uniqueColors(transform(previous));
    if (persistent && colors.join() !== previous.join()) {
      try {
        getStorage().setItem(storageKey, JSON.stringify(colors));
      } catch {
        persistent = false;
      }
    }
    return { colors, persistent };
  }

  return { read, update };
}

const palette = createPaletteStore(() => window.localStorage);
let refreshPalette = () => {};
const temporary = ' Die Palette bleibt nur für diese Sitzung verfügbar.';

export function addPaletteColors(values) {
  let added = 0;
  const state = palette.update(colors => {
    const next = uniqueColors([...colors, ...values]);
    added = next.length - colors.length;
    return next;
  });
  refreshPalette();
  const message = added === 0 ? 'Bereits in der Palette.'
    : added === 1 ? 'Eine Farbe zur Palette hinzugefügt.'
    : added + ' Farben zur Palette hinzugefügt.';
  return message + (state.persistent ? '' : temporary);
}

const ratioFormat = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function mountPaletteStudio(root) {
  root.innerHTML = `
    <div class="picker-layout">
      <section class="picker-stage palette-contrast" aria-labelledby="palette-contrast-heading">
        <h2 id="palette-contrast-heading">Kontrast</h2>
        <div class="palette-preview" data-contrast-preview aria-hidden="true">
          <strong>Großer Text</strong>
          <span>Normaler Text</span>
        </div>
        <div class="palette-contrast-fields">
          <label class="field">
            <span>Textfarbe (HEX)</span>
            <input type="text" data-foreground value="#0F1728" list="palette-suggestions" aria-describedby="palette-contrast-result" autocomplete="off" spellcheck="false">
          </label>
          <label class="field">
            <span>Hintergrund (HEX)</span>
            <input type="text" data-background value="#F8FAFB" list="palette-suggestions" aria-describedby="palette-contrast-result" autocomplete="off" spellcheck="false">
          </label>
        </div>
        <datalist id="palette-suggestions"></datalist>
        <div class="palette-contrast-result" id="palette-contrast-result" role="status" data-contrast-result></div>
      </section>
      <section class="picker-controls" aria-labelledby="palette-heading">
        <h2 id="palette-heading">Meine Palette</h2>
        <form class="palette-add" data-add-form>
          <label class="field">
            <span>Farbe (HEX)</span>
            <input type="text" data-add-value placeholder="#0C7FFB" autocomplete="off" spellcheck="false"
              aria-describedby="palette-status">
          </label>
          <button type="submit">Hinzufügen</button>
        </form>
        <p class="status" data-palette-status id="palette-status" role="status"></p>
        <p data-empty>Übernimm Farben aus dem Harmony Selector oder dem freien Picker oder gib einen HEX-Wert ein.</p>
        <ul class="swatch-list palette-colors" aria-label="Gespeicherte Farben" data-colors hidden></ul>
        <div class="palette-export" data-export hidden>
          <label class="field">
            <span>CSS-Variablen</span>
            <textarea readonly rows="4" data-css></textarea>
          </label>
          <div class="picker-actions">
            <button type="button" data-copy-css>CSS kopieren</button>
          </div>
          <p class="status" data-copy-status role="status"></p>
        </div>
      </section>
    </div>
  `;

  const form = root.querySelector('[data-add-form]');
  const hexField = root.querySelector('[data-add-value]');
  const status = root.querySelector('[data-palette-status]');
  const list = root.querySelector('[data-colors]');
  const empty = root.querySelector('[data-empty]');
  const suggestions = root.querySelector('datalist');
  const exportPanel = root.querySelector('[data-export]');
  const css = root.querySelector('[data-css]');
  const copyStatus = root.querySelector('[data-copy-status]');
  const foreground = root.querySelector('[data-foreground]');
  const background = root.querySelector('[data-background]');
  const preview = root.querySelector('[data-contrast-preview]');
  const result = root.querySelector('[data-contrast-result]');

  function renderPalette() {
    const { colors, persistent } = palette.read();
    status.textContent = persistent ? '' : temporary.trim();
    empty.hidden = colors.length > 0;
    list.hidden = exportPanel.hidden = colors.length === 0;
    list.innerHTML = colors.map(hex => `
      <li>
        <span class="swatch-sample" aria-hidden="true" style="background-color:${hex}"></span>
        <code>${hex}</code>
        <button type="button" data-remove="${hex}" aria-label="${hex} entfernen">Entfernen</button>
      </li>`).join('');
    suggestions.innerHTML = colors.map(hex => `<option value="${hex}"></option>`).join('');
    css.value = ':root {\n' + colors.map((hex, index) => '  --color-' + (index + 1) + ': ' + hex + ';').join('\n') + '\n}';
    copyStatus.textContent = '';
  }

  function renderContrast() {
    const text = normalizeHex(foreground.value);
    const fill = normalizeHex(background.value);
    for (const [field, value] of [[foreground, text], [background, fill]]) {
      if (value) field.removeAttribute('aria-invalid');
      else field.setAttribute('aria-invalid', 'true');
    }
    preview.hidden = !text || !fill;
    if (!text || !fill) {
      result.textContent = 'Gib einen HEX-Wert mit 3 oder 6 Zeichen ein.';
      return;
    }
    preview.style.color = text;
    preview.style.backgroundColor = fill;
    const ratio = contrastRatio(text, fill);
    const displayedRatio = ratioFormat.format(Math.floor(ratio * 100) / 100);
    const verdict = meets => meets ? 'erfüllt' : 'verfehlt';
    result.textContent = displayedRatio + ' : 1 · WCAG AA: Normaler Text ' + verdict(ratio >= 4.5)
      + ', großer Text ' + verdict(ratio >= 3) + '.';
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const hex = normalizeHex(hexField.value);
    if (!hex) {
      hexField.setAttribute('aria-invalid', 'true');
      status.textContent = 'Gib einen HEX-Wert mit 3 oder 6 Zeichen ein.';
      hexField.focus();
      return;
    }
    hexField.removeAttribute('aria-invalid');
    status.textContent = addPaletteColors([hex]);
    hexField.value = '';
    hexField.focus();
  });

  hexField.addEventListener('input', () => {
    if (!hexField.hasAttribute('aria-invalid')) return;
    hexField.removeAttribute('aria-invalid');
    status.textContent = '';
  });

  list.addEventListener('click', event => {
    const button = event.target.closest('[data-remove]');
    if (!button) return;
    const nextFocus = button.parentElement.nextElementSibling ?? button.parentElement.previousElementSibling;
    const nextColor = nextFocus?.querySelector('button').dataset.remove;
    const hex = button.dataset.remove;
    const { persistent } = palette.update(colors => colors.filter(color => color !== hex));
    renderPalette();
    (list.querySelector(`[data-remove="${nextColor}"]`) ?? hexField).focus();
    status.textContent = hex + ' entfernt.' + (persistent ? '' : temporary);
  });

  root.querySelector('[data-copy-css]').addEventListener('click', async () => {
    const value = css.value;
    try {
      await navigator.clipboard.writeText(value);
      if (css.value === value) copyStatus.textContent = 'CSS kopiert.';
    } catch {
      if (css.value !== value) return;
      css.focus();
      css.select();
      copyStatus.textContent = 'CSS ist markiert und kann manuell kopiert werden.';
    }
  });

  foreground.addEventListener('input', renderContrast);
  background.addEventListener('input', renderContrast);
  refreshPalette = renderPalette;
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) renderPalette();
  });
  renderPalette();
  renderContrast();
}
