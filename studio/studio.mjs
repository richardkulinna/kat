import { gridStyles, scaleSizes, steps, trackWidth } from './values.mjs';

const byId = id => document.getElementById(id);
const number = id => byId(id).valueAsNumber;
const type = document.body.dataset.studio === 'type';
const output = byId('css-output');
const fonts = {
  Montserrat: 'Montserrat, system-ui, sans-serif',
  Inter: 'Inter, system-ui, sans-serif',
  Georgia: 'Georgia, serif',
  Systemschrift: 'system-ui, sans-serif'
};
const format = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });

function showType() {
  const sizes = scaleSizes(number('base'), Number(byId('ratio').value));
  const family = fonts[byId('family').value];
  const weight = byId('weight').value;
  const leading = number('leading');
  const list = byId('scale');
  list.replaceChildren(...sizes.map((size, index) => {
    const row = document.createElement('li');
    const label = document.createElement('small');
    label.textContent = steps[index] + ' · ' + format.format(size) + ' px';
    const sample = document.createElement('span');
    sample.textContent = byId('sample').value;
    Object.assign(sample.style, { fontFamily: family, fontWeight: weight, fontSize: size + 'px', lineHeight: leading });
    row.append(label, sample);
    return row;
  }).reverse());
  return '.type-sample {\n  font-family: ' + family + ';\n  font-weight: ' + weight + ';\n  line-height: ' + leading + ';\n}\n\n' +
    sizes.map((size, i) => '.type-' + steps[i] + ' { font-size: ' + size + 'px; }').join('\n');
}

function showGrid() {
  const width = number('width'), cols = number('cols'), gap = number('gap'), margin = number('margin');
  const track = trackWidth(width, cols, gap, margin);
  if (track <= 0) throw new RangeError('Für die Spalten bleibt kein Platz. Verkleinere die Abstände oder erhöhe die Entwurfsbreite.');
  const styles = gridStyles(width, cols, gap, margin);
  const diagram = byId('diagram');
  Object.assign(diagram.parentElement.style, { containerType: 'inline-size', maxWidth: width + 'px' });
  diagram.style.cssText = styles;
  diagram.replaceChildren(...Array.from({ length: cols }, () => document.createElement('i')));
  byId('measure').textContent = cols + (cols === 1 ? ' Spalte' : ' Spalten') + ' · ' + format.format(track) + ' px je Spalte bei ' + format.format(width) + ' px Entwurfsbreite';
  return '.grid-frame {\n  width: 100%;\n  max-width: ' + width + 'px;\n  container-type: inline-size;\n}\n\n.layout-grid {\n  ' + styles + '\n}';
}

function render() {
  const invalid = document.querySelector('#controls input:invalid');
  let error = '';
  if (invalid) {
    error = invalid.labels[0].textContent.trim() + ' – gib einen gültigen Wert von ' + invalid.min + ' bis ' + invalid.max + ' ein.';
  } else {
    try { output.value = type ? showType() : showGrid(); }
    catch (exception) {
      if (!(exception instanceof RangeError)) throw exception;
      error = exception.message;
    }
  }
  if (error) {
    output.value = '';
    byId(type ? 'scale' : 'diagram').replaceChildren();
    if (!type) byId('measure').textContent = '';
  }
  byId('error').textContent = error;
  byId('feedback').textContent = '';
  byId('copy').disabled = byId('download').disabled = Boolean(error);
}

document.querySelector('main').addEventListener('input', render);
byId('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(output.value);
    byId('feedback').textContent = 'CSS kopiert.';
  } catch {
    output.focus();
    output.select();
    byId('feedback').textContent = 'CSS markiert. Kopiere den Text über das Kontextmenü oder per Tastenkürzel.';
  }
});
byId('download').addEventListener('click', () => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([output.value + '\n'], { type: 'text/css;charset=utf-8' }));
  link.download = type ? 'typostudio.css' : 'rasterstudio.css';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});
render();
