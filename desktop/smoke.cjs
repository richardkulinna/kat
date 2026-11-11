const assert = require('node:assert/strict');
const { setTimeout: delay } = require('node:timers/promises');
const { app } = require('electron');

module.exports = async function smoke(window) {
  assert.equal(process.arch, 'x64');
  assert.equal(app.isPackaged, true);
  const { webContents } = window;
  let ready = false;
  for (let attempt = 0; attempt < 50 && !ready; attempt += 1) {
    ready = await webContents.executeJavaScript(
      "Boolean(document.querySelector('[role=tablist]:not([hidden])') && document.querySelectorAll('[role=tabpanel] .picker-layout').length === 4)"
    );
    if (!ready) await delay(100);
  }
  assert.ok(ready, 'The color pickers mounted with network fonts disabled.');
  const isolation = await webContents.executeJavaScript(
    "[isSecureContext, typeof require, typeof navigator.clipboard.writeText]"
  );
  assert.deepEqual(isolation, [true, 'undefined', 'function']);
  await rotateHarmonyDial(webContents);
  await webContents.executeJavaScript("localStorage.setItem('kat-smoke', 'works')");
  await window.loadURL('kat://app/');
  const origin = await webContents.executeJavaScript(
    "[document.querySelector('a[href=\"./colors/index.html\"]')?.getAttribute('href'), localStorage.getItem('kat-smoke')]"
  );
  assert.deepEqual(origin, ['./colors/index.html', 'works']);
  const blocked = await webContents.executeJavaScript(
    "fetch('kat://app/desktop/main.cjs').then(response => response.status)"
  );
  assert.equal(blocked, 404, 'The app origin cannot read Electron main-process code.');
};

async function rotateHarmonyDial(webContents) {
  const dial = await webContents.executeJavaScript(`
    (() => {
      const element = document.querySelector('.harmony-dial');
      element.scrollIntoView({ block: 'center' });
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x: x + width / 2, y: y + height / 2, radius: Math.min(width, height) * 0.44 };
    })()
  `);
  assert.ok(dial.radius > 30, 'The harmony dial is visible and large enough to grip.');
  const debuggerSession = webContents.debugger;
  debuggerSession.attach('1.3');
  try {
    const point = degrees => ({
      x: dial.x + dial.radius * Math.sin(degrees * Math.PI / 180),
      y: dial.y - dial.radius * Math.cos(degrees * Math.PI / 180)
    });
    await debuggerSession.sendCommand('Input.dispatchMouseEvent', {
      type: 'mousePressed', ...point(0), button: 'left', buttons: 1, clickCount: 1
    });
    for (const degrees of [20, 40, 60, 80, 90]) {
      await debuggerSession.sendCommand('Input.dispatchMouseEvent', {
        type: 'mouseMoved', ...point(degrees), buttons: 1
      });
    }
    await debuggerSession.sendCommand('Input.dispatchMouseEvent', {
      type: 'mouseReleased', ...point(90), button: 'left', buttons: 0, clickCount: 1
    });
    const base = await webContents.executeJavaScript("document.querySelector('[data-base]').value");
    assert.equal(base, '3', 'Dragging the dial a quarter turn selects the fourth RYB hue.');
  } finally {
    debuggerSession.detach();
  }
}
