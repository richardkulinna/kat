const assert = require('node:assert/strict');
const http = require('node:http');
const { chromium } = require('playwright-core');

async function run() {
  const { default: worker } = await import('./generated/worker.mjs');
  const server = http.createServer(async (req, res) => {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const url = 'http://' + req.headers.host + req.url;
      const response = await worker.fetch(new Request(url, {
        method: req.method, headers: req.headers,
        body: chunks.length ? Buffer.concat(chunks) : undefined
      }), { KAT_PASSWORD: 'browser-fixture' });
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      console.error(error);
      res.writeHead(500).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROME_BIN, headless: true });
    const origin = 'http://127.0.0.1:' + server.address().port;
    for (const width of [390, 1366]) {
      const context = await browser.newContext({ viewport: { width, height: 840 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('https://fonts.**/*', route => route.abort());
      await page.goto(origin + '/studio/type.html');
      const password = page.locator('input[type=password]');
      await password.fill('wrong');
      await password.press('Enter');
      await password.waitFor();
      await password.fill('browser-fixture');
      await password.press('Enter');
      await page.waitForURL('**/studio/type.html');
      for (const path of ['/', '/colors/index.html', '/studio/type.html', '/studio/grid.html']) {
        const response = await page.goto(origin + path);
        assert.equal(response.status(), 200);
        await page.locator('main').waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, width + 'px ' + path);
      }
      await page.goto(origin + '/');
      await page.locator('form[action="/logout"] button').click();
      await password.waitFor();
      assert.equal((await context.request.get(origin + '/colors/free.mjs')).status(), 401);
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally {
    await browser?.close();
    server.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
