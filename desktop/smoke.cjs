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
      "Boolean(document.querySelector('[role=tablist]:not([hidden])') && document.querySelectorAll('[role=tabpanel] .picker-layout').length === 3)"
    );
    if (!ready) await delay(100);
  }
  assert.ok(ready, 'The color pickers mounted with network fonts disabled.');
  const isolation = await webContents.executeJavaScript(
    "[isSecureContext, typeof require, typeof navigator.clipboard.writeText]"
  );
  assert.deepEqual(isolation, [true, 'undefined', 'function']);
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
