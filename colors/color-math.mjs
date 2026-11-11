export const wrapHue = (hue) => ((hue % 360) + 360) % 360;

export function hexToRgb(hex) {
  return hex.slice(1).match(/../g).map((pair) => Number.parseInt(pair, 16));
}

export function rgbToHex(rgb) {
  return '#' + rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function rgbToHsl(rgb) {
  const [red, green, blue] = rgb.map((channel) => channel / 255);
  const high = Math.max(red, green, blue);
  const low = Math.min(red, green, blue);
  const delta = high - low;
  const lightness = (high + low) / 2;
  if (delta === 0) return [0, 0, lightness * 100];

  let hue;
  if (high === red) hue = (green - blue) / delta;
  else if (high === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  return [wrapHue(hue * 60), Math.min(100, saturation * 100), lightness * 100];
}

export function hslToRgb([hue, saturation, lightness]) {
  const h = wrapHue(hue);
  const s = saturation / 100;
  const l = lightness / 100;
  const amplitude = s * Math.min(l, 1 - l);

  return [0, 8, 4].map((offset) => {
    const k = (offset + h / 30) % 12;
    const component = l - amplitude * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(component * 255);
  });
}

export const primaryOffsets = [120, -120];
export const secondaryOffsets = [30, -30, 60, -60];

export function brandAccents([hue, saturation, lightness]) {
  return {
    candidates: primaryOffsets.map((offset) => [wrapHue(hue + offset), saturation, lightness]),
    secondary: secondaryOffsets.map((offset) => [wrapHue(hue + offset), Math.max(0, saturation - 20), lightness]),
  };
}
