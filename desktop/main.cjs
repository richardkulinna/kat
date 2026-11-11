const { app, BrowserWindow, protocol, session, shell } = require('electron');
const { mkdtempSync, writeFileSync } = require('node:fs');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const home = 'kat://app/colors/index.html';
const smokeTest = process.argv.includes('--smoke-test');
const externalHosts = new Set(['kulinna.art', 'patents.google.com', 'www2.cs.arizona.edu']);
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};
const contentSecurityPolicy = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'"
].join('; ');

protocol.registerSchemesAsPrivileged([{
  scheme: 'kat',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true }
}]);

function isAppUrl(url) {
  return url.protocol === 'kat:' && url.host === 'app' && !url.username && !url.password;
}

function assetPath(url) {
  if (!isAppUrl(url)) return null;
  try {
    const pathname = decodeURIComponent(url.pathname);
    const file = pathname.endsWith('/') ? pathname + 'index.html' : pathname;
    if (file === '/index.html' || file === '/styles.css') return file;
    if (/^\/(?:colors|assets)\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.[a-z0-9]+$/i.test(file)
        && Object.hasOwn(contentTypes, path.extname(file))) return file;
  } catch {
    // Ignore malformed percent-encoding.
  }
  return null;
}

async function serveAsset(request) {
  if (request.method !== 'GET') return new Response(null, { status: 405 });
  const file = assetPath(new URL(request.url));
  if (file) {
    try {
      const body = await readFile(path.join(app.getAppPath(), file.slice(1)));
      return new Response(body, {
        headers: {
          'Content-Type': contentTypes[path.extname(file)],
          'Content-Security-Policy': contentSecurityPolicy,
          'X-Content-Type-Options': 'nosniff'
        }
      });
    } catch (error) {
      if (error.code !== 'ENOENT') console.error(error);
    }
  }
  return new Response(null, { status: 404 });
}

function openExternal(url) {
  if (url.protocol === 'https:' && !url.username && !url.password && !url.port
      && externalHosts.has(url.hostname)) {
    shell.openExternal(url.href).catch(console.error);
  }
}

function allowClipboardWrite(permission, source) {
  const url = URL.parse(source);
  return permission === 'clipboard-sanitized-write' && url !== null && isAppUrl(url);
}

async function createWindow() {
  const window = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 460,
    minHeight: 440,
    backgroundColor: '#F8FAFB',
    autoHideMenuBar: true,
    show: !smokeTest,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
  });
  window.webContents.on('will-navigate', event => {
    const url = new URL(event.url);
    if (assetPath(url)?.endsWith('.html')) return;
    event.preventDefault();
    openExternal(url);
  });
  window.webContents.on('will-redirect', event => event.preventDefault());
  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(new URL(url));
    return { action: 'deny' };
  });

  await window.loadURL(home);
  if (smokeTest) {
    await require('./smoke.cjs')(window);
    app.exit(0);
  }
}

if (smokeTest) {
  app.setPath('userData', mkdtempSync(path.join(app.getPath('temp'), 'kat-smoke-')));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [window] = BrowserWindow.getAllWindows();
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });
  app.on('window-all-closed', () => app.quit());
  app.whenReady().then(() => {
    app.setAppUserModelId('art.kulinna.kat');
    protocol.handle('kat', serveAsset);
    const activeSession = session.defaultSession;
    activeSession.setPermissionCheckHandler((_contents, permission, origin) => {
      return allowClipboardWrite(permission, origin);
    });
    activeSession.setPermissionRequestHandler((_contents, permission, reply, details) => {
      reply(allowClipboardWrite(permission, details.requestingUrl));
    });
    if (smokeTest) {
      activeSession.webRequest.onBeforeRequest(
        { urls: ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*'] },
        (_details, reply) => reply({ cancel: true })
      );
    }
    return createWindow();
  }).catch(error => {
    console.error(error);
    if (smokeTest && process.env.KAT_SMOKE_LOG) {
      writeFileSync(process.env.KAT_SMOKE_LOG, error.stack ?? String(error));
    }
    app.exit(1);
  });
}
