import { chromium } from 'playwright-core';

const endpoint = process.env.CDP_ENDPOINT ?? 'http://127.0.0.1:9222';
const browser = await chromium.connectOverCDP(endpoint);
const context = browser.contexts()[0];
const page = context.pages().find((item) => item.url().includes('index.html')) ?? context.pages()[0];
if (!page) throw new Error('no page found');

page.on('console', (message) => {
  if (message.type() === 'error') console.log('console-error:', message.text());
});
page.on('pageerror', (error) => console.log('pageerror:', error.message));

// 从干净状态开始，避免上次验证留下的暂停计时影响断言。
await page.evaluate(() => localStorage.removeItem('pomogrove.store.v1'));
await page.reload({ waitUntil: 'domcontentloaded' });

console.log('title:', await page.title());
console.log('url:', page.url());
await page.waitForSelector('.timer-clock', { timeout: 15000 });
console.log('clock:', (await page.locator('.timer-clock').innerText()).trim());
console.log('phase:', await page.locator('.timer-card').getAttribute('data-phase'));

await page.getByRole('button', { name: '开始专注' }).click();
await page.waitForTimeout(2200);
console.log('clock-after-start:', (await page.locator('.timer-clock').innerText()).trim());
console.log('running:', await page.locator('.timer-card').getAttribute('data-running'));

await page.screenshot({ path: 'screenshots/desktop-packaged.png' });
await page.getByRole('button', { name: '暂停' }).click();
await page.waitForTimeout(300);
console.log('after-pause:', (await page.locator('.timer-clock').innerText()).trim());

// 确认四个页面在打包环境里都能渲染。
for (const name of ['任务', '花园', '设置', '计时']) {
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).first().click();
  await page.waitForTimeout(250);
  console.log(`view-${name}:`, await page.locator('.app-main').getAttribute('data-view'));
}

await browser.close();
