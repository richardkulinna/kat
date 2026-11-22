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
    for (const width of [320, 390, 1366]) {
      const context = await browser.newContext({ viewport: { width, height: 840 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('https://fonts.**/*', route => route.abort());
      async function checkBoldMontserrat(heading) {
        const [loaded, tracking, kerning] = await heading.evaluate(async element => {
          const css = getComputedStyle(element);
          const faces = await document.fonts.load('800 32px Montserrat', element.textContent);
          return [faces.some(face => face.status === 'loaded' && ['700 900', '800'].includes(face.weight)),
            parseFloat(css.letterSpacing) / parseFloat(css.fontSize), css.fontKerning];
        });
        assert(loaded, 'Self-hosted ExtraBold loaded');
        assert(Math.abs(tracking - .005) < .0001, 'Montserrat tracking is +.005em');
        assert.equal(kerning, 'normal');
      }
      await page.goto(origin + '/studio/type.html');
      await checkBoldMontserrat(page.locator('h1'));
      const fontResponse = await context.request.get(origin + '/assets/fonts/kulinna-extrabold.woff2');
      assert.equal(fontResponse.status(), 200);
      assert.equal(fontResponse.headers()['content-type'], 'font/woff2');
      assert.equal((await fontResponse.body()).subarray(0,4).toString(), 'wOF2');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'login fits ' + width);

      const password = page.locator('input[type=password]');
      await password.fill('wrong');
      await password.press('Enter');
      await page.getByRole('alert').waitFor();
      await password.fill('browser-fixture');
      await password.press('Enter');
      await page.waitForURL('**/studio/type.html');
      for (const path of ['/', '/colors/index.html', '/studio/type.html', '/studio/grid.html']) {
        const response = await page.goto(origin + path);
        assert.equal(response.status(), 200);
        await page.locator('main').waitFor();
        await checkBoldMontserrat(page.locator('h1'));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, width + 'px ' + path);
      }
      await page.goto(origin + '/studio/type.html');
      await page.locator('#weight').selectOption('700');
      await checkBoldMontserrat(page.locator('#scale li span').first());
      assert.match(await page.locator('#css-output').inputValue(), /kulinna-extrabold[.]woff2/);
      await page.locator('#family').selectOption('Inter');
      assert.doesNotMatch(await page.locator('#css-output').inputValue(), /kulinna-extrabold[.]woff2/);
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
