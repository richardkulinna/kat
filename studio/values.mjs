export const steps = ['sm', 'base', 'md', 'lg', 'xl', '2xl'];

export function scaleSizes(base, ratio) {
  return steps.map((_, index) => Number((base * ratio ** (index - 1)).toFixed(2)));
}

export function trackWidth(width, cols, gap, margin) {
  return (width - 2 * margin - (cols - 1) * gap) / cols;
}

export function gridStyles(width, cols, gap, margin) {
  const unit = value => Number((100 * value / width).toFixed(7)) + 'cqw';
  return [
    'box-sizing: border-box', 'display: grid',
    'grid-template-columns: repeat(' + cols + ', minmax(0, 1fr))',
    'column-gap: ' + unit(gap), 'padding-inline: ' + unit(margin)
  ].join(';\n  ') + ';';
}
