export function normalizeHex(value) {
  if (typeof value !== 'string') return null;
  const digits = value.trim().replace(/^#/, '');
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(digits)) return null;
  const full = digits.length === 3
    ? [...digits].map(digit => digit.repeat(2)).join('')
    : digits;
  return '#' + full.toUpperCase();
}

function channelsOf(hex) {
  return hex.slice(1).match(/../g).map(pair => Number.parseInt(pair, 16));
}

function luminance(hex) {
  const [red, green, blue] = channelsOf(hex).map(channel => {
    const value = channel / 255;
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
const themeKey = 'kat-colors-theme-v1';
const roles = [
  ['background', 'Hintergrund', '#F8FAFB'],
  ['text', 'Text', '#0F1728'],
  ['primary-1', 'Primär 1', '#FB0C7F'],
  ['primary-2', 'Primär 2', '#0C7FFB'],
  ['secondary-1', 'Sekundär 1', '#7D67FC'],
  ['secondary-2', 'Sekundär 2', '#04DEA6'],
  ['secondary-3', 'Sekundär 3', '#FBA529'],
  ['secondary-4', 'Sekundär 4', '#FC4D4D'],
];

export const defaultTheme = Object.freeze(roles.map(([, , value]) => value));

function uniqueColors(values) {
  return [...new Set(values.map(normalizeHex).filter(Boolean))];
}

function normalizeTheme(values) {
  if (!Array.isArray(values) || values.length !== roles.length) return null;
  const colors = Array.from(values, normalizeHex);
  return colors.every(Boolean) ? colors : null;
}

function createColorStore(getStorage, key, normalize) {
  let colors = normalize(null);
  let persistent = true;

  function read() {
    if (persistent) {
      try {
        const raw = getStorage().getItem(key);
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = null;
        }
        colors = normalize(parsed);
      } catch {
        persistent = false;
      }
    }
    return { colors: [...colors], persistent };
  }

  function update(transform) {
    const previous = read().colors;
    colors = normalize(transform(previous));
    if (persistent && colors.join() !== previous.join()) {
      try {
        getStorage().setItem(key, JSON.stringify(colors));
      } catch {
        persistent = false;
      }
    }
    return { colors: [...colors], persistent };
  }

  return { read, update };
}

export function createPaletteStore(getStorage) {
  return createColorStore(getStorage, storageKey, values => Array.isArray(values) ? uniqueColors(values) : []);
}

export function createThemeStore(getStorage) {
  return createColorStore(getStorage, themeKey, values => normalizeTheme(values) ?? defaultTheme);
}

export function makeShades(hex) {
  const color = normalizeHex(hex);
  if (!color) return [];
  const channels = channelsOf(color);
  const lightness = (Math.max(...channels) + Math.min(...channels)) / 510;
  const darker = Math.round(5 * lightness);
  const lighter = 5 - darker;
  function mix(target, amount) {
    return '#' + channels.map(channel =>
      Math.round(channel + (target - channel) * amount).toString(16).padStart(2, '0')
    ).join('').toUpperCase();
  }
  return [
    ...Array.from({ length: darker }, (_, i) => mix(0, (darker - i) / (darker + 1))),
    color,
    ...Array.from({ length: lighter }, (_, i) => mix(255, (i + 1) / (lighter + 1))),
  ];
}

const palette = createPaletteStore(() => window.localStorage);
const theme = createThemeStore(() => window.localStorage);
let refreshPalette = () => {};
let refreshTheme = () => {};
const temporary = 'Änderungen bleiben für diese Sitzung erhalten.';

export function setThemePalette(values) {
  const colors = normalizeTheme(values);
  if (!colors) return false;
  theme.update(() => colors);
  refreshTheme();
  return true;
}

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
  return state.persistent ? message : message + ' ' + temporary;
}

const ratioFormat = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pairings = [
  [1, 2, 'Text auf Primär 1'],
  [1, 3, 'Text auf Primär 2'],
  [2, 0, 'Primär 1 auf Hintergrund'],
  [3, 0, 'Primär 2 auf Hintergrund'],
];

function formatRatio(ratio) {
  return ratioFormat.format(Math.floor(ratio * 100) / 100) + ' : 1';
}

export function mountPaletteStudio(root) {
  root.innerHTML = `
    <div class="palette-studio">
      <section aria-labelledby="palette-heading">
        <div class="palette-heading">
          <h2 id="palette-heading">Farbrollen</h2>
          <button type="button" data-reset>Standardfarben laden</button>
        </div>
        <div class="palette-roles" role="group" aria-label="Farbrolle wählen">
          ${roles.map(([, label], index) => `
            <button type="button" class="palette-role" data-role="${index}" aria-pressed="false" aria-controls="palette-role-editor">
              <span class="palette-role-color" aria-hidden="true"></span>
              <span class="palette-role-label"><strong>${label}</strong><code></code></span>
            </button>`).join('')}
        </div>
        <div class="palette-editor" id="palette-role-editor">
          <div>
            <h3 data-role-heading></h3>
            <form class="palette-edit" data-edit>
              <label class="field">
                <span>Farbauswahl</span>
                <input type="color" data-native-color>
              </label>
              <label class="field">
                <span>HEX</span>
                <input type="text" size="8" data-role-hex list="palette-suggestions" aria-describedby="palette-theme-status"
                  autocomplete="off" spellcheck="false" maxlength="7">
              </label>
              <button type="submit">Anwenden</button>
            </form>
          </div>
          <div>
            <h3>Farbabstufungen</h3>
            <div class="palette-shades" data-shades role="group" aria-label="Farbabstufung anwenden">
              ${Array.from({ length: 6 }, () => '<button type="button" class="palette-shade" data-shade><span aria-hidden="true"></span><code></code></button>').join('')}
            </div>
          </div>
        </div>
        <p class="palette-status" data-theme-status id="palette-theme-status" role="status"></p>
        <datalist id="palette-suggestions"></datalist>
      </section>
      <div class="palette-results">
        <article class="palette-proof" aria-label="Editorial-Vorschau" data-preview>
          <header>
            <p class="palette-proof-kicker">Mobilität im Alltag</p>
            <h3>Wege durch<br>die Stadt</h3>
          </header>
          <p class="palette-proof-lede">Mehr als die Hälfte der Wege wird zu Fuß oder mit dem Rad zurückgelegt.</p>
          <figure>
            <figcaption>Verkehrsmittel nach Anteil · Beispieldaten</figcaption>
            <ul>
              ${[['Zu Fuß', 34], ['Rad', 26], ['Bus &amp; Bahn', 23], ['Auto', 17]].map(([label, share], index) => `
                <li style="--share:${share}%;--bar:var(--secondary-${index + 1})">
                  <span>${label}</span><span class="palette-bar" aria-hidden="true"></span><strong>${share} %</strong>
                </li>`).join('')}
            </ul>
          </figure>
        </article>
        <section class="palette-contrast" aria-labelledby="palette-contrast-heading">
          <h3 id="palette-contrast-heading">Kontrast · WCAG AA</h3>
          <p class="palette-contrast-score" data-score></p>
          <p class="palette-contrast-main" data-main-contrast aria-live="polite"></p>
          <table>
            <thead><tr><th scope="col">Farbpaar</th><th scope="col">Kontrast</th><th scope="col">AA für Text</th></tr></thead>
            <tbody data-pairs></tbody>
          </table>
          <a href="https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html">Grenzwerte für Textgrößen</a>
        </section>
      </div>
      <details class="palette-disclosure">
        <summary>CSS exportieren</summary>
        <label class="field">
          <span>CSS-Variablen</span>
          <textarea readonly rows="10" data-css></textarea>
        </label>
        <button type="button" data-copy-css>CSS kopieren</button>
        <p class="palette-status" data-copy-status role="status"></p>
      </details>
      <details class="palette-disclosure">
        <summary>Gespeicherte Farben <span data-count></span></summary>
        <form class="palette-add" data-add-form>
          <label class="field">
            <span>Farbe (HEX)</span>
            <input type="text" data-add-value placeholder="#0C7FFB" autocomplete="off" spellcheck="false"
              aria-describedby="palette-status">
          </label>
          <button type="submit">Hinzufügen</button>
        </form>
        <p class="palette-status" data-palette-status id="palette-status" role="status"></p>
        <p data-empty>Füge HEX-Werte hinzu oder speichere Farben aus den anderen Werkzeugen.</p>
        <ul class="swatch-list palette-colors" aria-label="Gespeicherte Farben" data-colors hidden></ul>
      </details>
    </div>
  `;

  const find = selector => root.querySelector(selector);
  const roleButtons = [...root.querySelectorAll('[data-role]')];
  const shadeButtons = [...root.querySelectorAll('[data-shade]')];
  const nativeColor = find('[data-native-color]');
  const roleHex = find('[data-role-hex]');
  const themeStatus = find('[data-theme-status]');
  const preview = find('[data-preview]');
  const css = find('[data-css]');
  const copyStatus = find('[data-copy-status]');
  const form = find('[data-add-form]');
  const hexField = find('[data-add-value]');
  const status = find('[data-palette-status]');
  const list = find('[data-colors]');
  let active = 0;

  function renderTheme() {
    const { colors, persistent } = theme.read();
    const hex = colors[active];
    const label = roles[active][1];
    find('[data-role-heading]').textContent = label + ' bearbeiten';
    nativeColor.setAttribute('aria-label', label + ' · Farbauswahl');
    roleHex.setAttribute('aria-label', label + ' · HEX');
    if (nativeColor.value.toUpperCase() !== hex) nativeColor.value = hex;
    roleHex.value = hex;
    roleHex.removeAttribute('aria-invalid');
    themeStatus.textContent = persistent ? '' : temporary;

    roles.forEach(([name], index) => {
      const button = roleButtons[index];
      const color = colors[index];
      button.setAttribute('aria-pressed', String(index === active));
      button.style.setProperty('--sample', color);
      button.querySelector('code').textContent = color;
      preview.style.setProperty('--' + name, color);
    });
    makeShades(hex).forEach((shade, index) => {
      const button = shadeButtons[index];
      button.style.setProperty('--sample', shade);
      button.setAttribute('aria-label', shade + (shade === hex ? ' · aktueller Farbton' : ' für ' + label + ' anwenden'));
      button.setAttribute('aria-pressed', String(shade === hex));
      button.dataset.shade = shade;
      button.querySelector('code').textContent = shade;
    });

    const [background, text] = colors;
    const ratio = contrastRatio(text, background);
    find('[data-score]').textContent = formatRatio(ratio);
    find('[data-main-contrast]').textContent = 'Text auf Hintergrund · Normaler Text '
      + (ratio >= 4.5 ? 'erfüllt' : 'verfehlt') + ' AA, großer Text '
      + (ratio >= 3 ? 'erfüllt' : 'verfehlt') + ' AA.';
    find('[data-pairs]').innerHTML = pairings.map(([front, back, label]) => {
      const ratio = contrastRatio(colors[front], colors[back]);
      const verdict = ratio >= 4.5 ? 'Alle Größen' : ratio >= 3 ? 'Großer Text' : 'Verfehlt';
      return `<tr><th scope="row">${label}</th><td>${formatRatio(ratio)}</td><td>${verdict}</td></tr>`;
    }).join('');
    renderExport(colors);
  }

  function renderExport(colors = theme.read().colors, saved = palette.read().colors) {
    const declarations = roles.map(([name], index) => '  --' + name + ': ' + colors[index] + ';');
    declarations.push(...saved.map((hex, index) => '  --color-' + (index + 1) + ': ' + hex + ';'));
    css.value = ':root {\n' + declarations.join('\n') + '\n}';
    copyStatus.textContent = '';
  }

  function applyColor(hex, announce) {
    const { persistent } = theme.update(colors => colors.map((color, index) => index === active ? hex : color));
    renderTheme();
    if (announce) themeStatus.textContent = roles[active][1] + ' · ' + hex + ' angewendet.'
      + (persistent ? '' : ' ' + temporary);
  }

  find('.palette-roles').addEventListener('click', event => {
    const button = event.target.closest('[data-role]');
    if (!button) return;
    active = Number(button.dataset.role);
    renderTheme();
  });
  nativeColor.addEventListener('input', () => applyColor(normalizeHex(nativeColor.value), false));
  find('[data-edit]').addEventListener('submit', event => {
    event.preventDefault();
    const hex = normalizeHex(roleHex.value);
    if (hex) {
      applyColor(hex, true);
      return;
    }
    roleHex.setAttribute('aria-invalid', 'true');
    themeStatus.textContent = 'Gib einen HEX-Wert mit 3 oder 6 Zeichen ein.';
    roleHex.focus();
  });
  roleHex.addEventListener('input', () => {
    if (!roleHex.hasAttribute('aria-invalid')) return;
    roleHex.removeAttribute('aria-invalid');
    themeStatus.textContent = '';
  });
  find('[data-shades]').addEventListener('click', event => {
    const button = event.target.closest('[data-shade]');
    if (button) {
      const hex = button.dataset.shade;
      applyColor(hex, true);
      shadeButtons.find(shade => shade.dataset.shade === hex).focus();
    }
  });
  find('[data-reset]').addEventListener('click', () => {
    setThemePalette(defaultTheme);
    themeStatus.textContent = 'Standardfarben geladen.' + (theme.read().persistent ? '' : ' ' + temporary);
  });

  function renderPalette() {
    const { colors, persistent } = palette.read();
    status.textContent = persistent ? '' : temporary;
    find('[data-count]').textContent = '(' + colors.length + ')';
    find('[data-empty]').hidden = colors.length > 0;
    list.hidden = colors.length === 0;
    list.innerHTML = colors.map(hex => `
      <li>
        <span class="swatch-sample" aria-hidden="true" style="background-color:${hex}"></span>
        <code>${hex}</code>
        <button type="button" data-remove="${hex}" aria-label="${hex} entfernen">Entfernen</button>
      </li>`).join('');
    find('datalist').innerHTML = colors.map(hex => `<option value="${hex}"></option>`).join('');
    renderExport(undefined, colors);
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
    status.textContent = hex + ' entfernt.' + (persistent ? '' : ' ' + temporary);
  });

  find('[data-copy-css]').addEventListener('click', async () => {
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

  refreshPalette = renderPalette;
  refreshTheme = renderTheme;
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) renderPalette();
    if (event.key === themeKey || event.key === null) renderTheme();
  });
  renderPalette();
  renderTheme();
}
