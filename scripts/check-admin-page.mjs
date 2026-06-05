import { chromium } from 'playwright';

const url = process.argv[2] || 'http://192.168.5.61:51720/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
const failed = [];

page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
});
page.on('requestfailed', (req) => {
  failed.push(`${req.failure()?.errorText || 'failed'}: ${req.url()}`);
});

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
for (let i = 0; i < 60; i += 1) {
  const state = await page.evaluate(() => ({
    loading: !!document.getElementById('axhub-admin-boot-loading'),
    pc: !!document.querySelector('.pc-layout'),
    bootError: document.getElementById('axhub-boot-error')?.textContent?.slice(0, 300) || null,
  }));
  if (!state.loading || state.pc || state.bootError) {
    console.log(JSON.stringify({ url, waitSec: i, state, failed, errors: errors.slice(0, 12) }, null, 2));
    await browser.close();
    process.exit(state.pc ? 0 : 1);
  }
  await page.waitForTimeout(1000);
}
const state = await page.evaluate(() => ({
  loading: !!document.getElementById('axhub-admin-boot-loading'),
  pc: !!document.querySelector('.pc-layout'),
}));
console.log(JSON.stringify({ url, timeout: true, state, failed, errors }, null, 2));
await browser.close();
process.exit(1);
