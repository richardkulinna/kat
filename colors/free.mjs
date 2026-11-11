function normalizeHex(value) {
  const digits = value.trim().replace(/^#/, "");
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(digits)) return null;

  const full = digits.length === 3
    ? [...digits].map((digit) => digit.repeat(2)).join("")
    : digits;
  return "#" + full.toUpperCase();
}

function toRgb(hex) {
  const channels = hex.slice(1).match(/../g).map((pair) => Number.parseInt(pair, 16));
  return "rgb(" + channels.join(", ") + ")";
}

export function mountFreePicker(root) {
  root.innerHTML = `
    <div class="picker-layout">
      <div class="picker-stage" data-preview aria-hidden="true"></div>
      <div class="picker-controls">
        <label class="field">
          <span>Farbe wählen</span>
          <input type="color" value="#0c7ffb">
        </label>
        <label class="field">
          <span>HEX</span>
          <input type="text" data-hex autocomplete="off" spellcheck="false">
        </label>
        <label class="field">
          <span>RGB</span>
          <input type="text" data-rgb readonly>
        </label>
        <div class="picker-actions">
          <button type="button" data-copy-hex>HEX kopieren</button>
          <button type="button" data-copy-rgb>RGB kopieren</button>
        </div>
        <p class="status" id="free-picker-status" role="status"></p>
      </div>
    </div>
  `;

  const preview = root.querySelector("[data-preview]");
  const color = root.querySelector('input[type="color"]');
  const hexField = root.querySelector("[data-hex]");
  const rgbField = root.querySelector("[data-rgb]");
  const copyHex = root.querySelector("[data-copy-hex]");
  const copyRgb = root.querySelector("[data-copy-rgb]");
  const status = root.querySelector("[role=status]");
  let hex;

  function updateColor(value) {
    hex = value;
    preview.style.backgroundColor = hex;
    color.value = hex.toLowerCase();
    rgbField.value = toRgb(hex);
    hexField.removeAttribute("aria-invalid");
    hexField.removeAttribute("aria-describedby");
    copyHex.disabled = false;
    copyRgb.disabled = false;
    status.textContent = "";
  }

  function updateHex(commit) {
    const value = normalizeHex(hexField.value);
    if (value) {
      updateColor(value);
      if (commit) hexField.value = value;
      return;
    }

    copyHex.disabled = true;
    copyRgb.disabled = true;
    if (commit) {
      hexField.setAttribute("aria-invalid", "true");
      hexField.setAttribute("aria-describedby", status.id);
      status.textContent = "Gib 3 oder 6 Hexadezimalzeichen ein, zum Beispiel #F80 oder #FF8800.";
    } else if (!hexField.hasAttribute("aria-invalid")) {
      status.textContent = "";
    }
  }

  function readColorInput() {
    const value = normalizeHex(color.value);
    hexField.value = value;
    updateColor(value);
  }

  async function copyValue(value, field) {
    const previousValue = field.value;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        status.textContent = value + " kopiert.";
        return;
      } catch {
        // Select the visible value for manual copying.
      }
    }

    if (field.value !== previousValue) return;
    field.value = value;
    field.focus();
    field.select();
    status.textContent = "Automatisches Kopieren ist nicht verfügbar. Der Wert ist markiert und kann manuell kopiert werden.";
  }

  color.addEventListener("input", readColorInput);
  color.addEventListener("change", readColorInput);
  hexField.addEventListener("input", () => updateHex(false));
  hexField.addEventListener("blur", () => updateHex(true));
  hexField.addEventListener("keydown", (event) => {
    if (event.key === "Enter") updateHex(true);
  });
  copyHex.addEventListener("click", () => copyValue(hex, hexField));
  copyRgb.addEventListener("click", () => copyValue(rgbField.value, rgbField));

  readColorInput();
}
