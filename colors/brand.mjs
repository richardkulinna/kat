import { normalizeHex, setThemePalette } from './palette.mjs';
import { brandAccents, hexToRgb, hslToRgb, primaryOffsets, rgbToHex, rgbToHsl } from './color-math.mjs';

const roles = [
  ['background', 'Hintergrund'],
  ['text', 'Text'],
  ['primary-1', 'Primärfarbe 1'],
  ['primary-2', 'Primärfarbe 2'],
  ['secondary-1', 'Sekundärfarbe 1'],
  ['secondary-2', 'Sekundärfarbe 2'],
  ['secondary-3', 'Sekundärfarbe 3'],
  ['secondary-4', 'Sekundärfarbe 4'],
];
const defaults = ['#F8FAFB', '#0F1728', '#FB0C7F'];
const signedAngle = (degrees) => (degrees > 0 ? '+' + degrees : '−' + Math.abs(degrees)) + '°';
const toHex = (hsl) => rgbToHex(hslToRgb(hsl));

export function mountBrandPicker(root) {
  root.innerHTML = `
    <div class="picker-layout brand-layout">
      <section class="brand-builder" aria-labelledby="brand-input-title">
        <h2 id="brand-input-title">Ausgangsfarben</h2>
        <div class="brand-inputs">
          ${roles.slice(0, 3).map(([key, label], index) => `
            <div class="brand-input" data-color-input>
              <label for="brand-${key}">${label}</label>
              <input id="brand-${key}" type="text" value="${defaults[index]}" aria-label="${label} (HEX)"
                autocomplete="off" spellcheck="false" autocapitalize="off">
              <input type="color" value="${defaults[index].toLowerCase()}" aria-label="${label} auswählen">
            </div>`).join('')}
        </div>
        <fieldset class="brand-candidates">
          <legend>Primärfarbe 2 wählen</legend>
          <div class="brand-candidate-grid">
            ${primaryOffsets.map((offset, index) => `
              <label class="brand-candidate brand-card">
                <span class="brand-sample" aria-hidden="true"></span>
                <span class="brand-choice">
                  <input type="radio" name="brand-candidate" value="${index}" ${index === 0 ? 'checked' : ''}>
                  <span><strong>${signedAngle(offset)}</strong> <span data-candidate-hex></span></span>
                </span>
              </label>`).join('')}
          </div>
        </fieldset>
        <details class="brand-recipe">
          <summary>So entstehen die Farben</summary>
          <p>Die Kandidaten für Primärfarbe 2 liegen bei +120° und −120° ab Primärfarbe 1. Sättigung und Helligkeit bleiben gleich.</p>
          <p>Die vier Sekundärfarben liegen bei +30°, −30°, +60° und −60° ab Primärfarbe 1. Die Sättigung sinkt um 20 Prozentpunkte bis mindestens 0%. Die Helligkeit bleibt gleich.</p>
        </details>
      </section>
      <section class="picker-controls brand-results" aria-labelledby="brand-result-title">
        <h2 id="brand-result-title">Markenpalette</h2>
        <ul class="brand-palette" aria-label="Farben und HEX-Werte">
          ${roles.map(([, label]) => `
            <li class="brand-card">
              <span class="brand-sample" aria-hidden="true"></span>
              <strong>${label}</strong>
              <span class="brand-hex" data-role-hex></span>
            </li>`).join('')}
        </ul>
        <div class="picker-actions">
          <button type="button" data-brand-palette>Markenpalette übernehmen</button>
        </div>
        <details class="brand-export">
          <summary>CSS-Variablen</summary>
          <label class="field">
            <span>CSS für alle acht Farbrollen</span>
            <textarea data-brand-css rows="10" readonly></textarea>
          </label>
          <button type="button" data-brand-copy>CSS kopieren</button>
        </details>
        <p class="status" id="brand-picker-status" role="status"></p>
      </section>
    </div>`;

  const status = root.querySelector('[role="status"]');
  const addToPalette = root.querySelector('[data-brand-palette]');
  const copy = root.querySelector('[data-brand-copy]');
  const cssField = root.querySelector('[data-brand-css]');
  const candidateCards = [...root.querySelectorAll('.brand-candidate')];
  const roleCards = [...root.querySelectorAll('.brand-palette > li')];
  const choices = [...root.querySelectorAll('[data-color-input] input[type="text"]')];
  const inputs = [...root.querySelectorAll('[data-color-input] input[type="color"]')];
  const originals = [...defaults];
  let chosenCandidate = 0;
  let values;

  function paint(card, hex, selector) {
    card.querySelector('.brand-sample').style.backgroundColor = hex;
    card.querySelector(selector).textContent = hex;
  }

  function render() {
    const { candidates, secondary } = brandAccents(rgbToHsl(hexToRgb(originals[2])));
    const candidateValues = candidates.map(toHex);
    values = [...originals, candidateValues[chosenCandidate], ...secondary.map(toHex)];
    candidateCards.forEach((card, index) => paint(card, candidateValues[index], '[data-candidate-hex]'));
    roleCards.forEach((card, index) => paint(card, values[index], '[data-role-hex]'));
    cssField.value = [
      ':root {',
      ...roles.map(([key], index) => `  --${key}: ${values[index]};`),
      '}',
    ].join('\n');
  }

  function updateValidity() {
    const invalid = choices.some((choice) => !normalizeHex(choice.value));
    addToPalette.disabled = invalid;
    copy.disabled = invalid;
    return invalid;
  }

  function readHex(index, commit) {
    const field = choices[index];
    const value = normalizeHex(field.value);
    if (value) {
      if (commit) field.value = value;
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
      inputs[index].value = value.toLowerCase();
      originals[index] = value;
      render();
    } else if (commit) {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', status.id);
      status.textContent = 'Gib 3 oder 6 Hexadezimalzeichen ein, zum Beispiel #F80 oder #FF8800.';
    }
    if (!updateValidity()) status.textContent = '';
  }

  choices.forEach((field, index) => {
    const color = inputs[index];
    field.addEventListener('input', () => readHex(index, false));
    field.addEventListener('blur', () => readHex(index, true));
    field.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') readHex(index, true);
    });
    function readColor() {
      field.value = color.value;
      readHex(index, true);
    }
    color.addEventListener('input', readColor);
    color.addEventListener('change', readColor);
  });

  root.querySelector('.brand-candidates').addEventListener('change', (event) => {
    chosenCandidate = Number(event.target.value);
    render();
    if (!updateValidity()) status.textContent = '';
  });

  addToPalette.addEventListener('click', () => {
    status.textContent = setThemePalette(values)
      ? 'Markenpalette übernommen.'
      : 'Die Markenpalette konnte nicht übernommen werden.';
  });

  copy.addEventListener('click', async () => {
    const value = cssField.value;
    try {
      await navigator.clipboard.writeText(value);
      status.textContent = 'CSS-Variablen kopiert.';
    } catch {
      if (cssField.value !== value || copy.disabled) return;
      cssField.focus();
      cssField.select();
      status.textContent = 'CSS markiert. Kopiere es manuell.';
    }
  });

  render();
}
