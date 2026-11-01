import { chromium } from 'playwright-core';

const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const base = process.env.APP_URL || 'http://localhost:5174';
const browser = await chromium.launch({ executablePath: chrome, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

await page.goto(base, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });

check('页面标题', (await page.title()).includes('番茄小园'), await page.title());
const clock = page.locator('.timer-clock');
check('初始计时 25:00', (await clock.textContent()) === '25:00', await clock.textContent());

await page.getByRole('button', { name: /开始专注/ }).click();
await page.waitForTimeout(1300);
const runningClock = await clock.textContent();
check('开始后倒计时', runningClock !== '25:00', runningClock);
check('运行态', (await page.locator('.timer-card').getAttribute('data-running')) === 'true');

await page.getByRole('button', { name: /暂停/ }).click();
const pausedClock = await clock.textContent();
await page.waitForTimeout(1100);
check('暂停后不走时', (await clock.textContent()) === pausedClock, pausedClock);

await page.getByRole('button', { name: '重置计时' }).click();
check('重置回 25:00', (await clock.textContent()) === '25:00', await clock.textContent());

await page.getByRole('button', { name: '任务' }).first().click();
await page.getByRole('button', { name: '新建任务' }).click();
await page.getByPlaceholder('例如：整理完本周的项目笔记').fill('验收番茄钟');
await page.getByRole('button', { name: '种下任务' }).click();
await page.waitForTimeout(300);
check('新建任务出现', await page.getByText('验收番茄钟').first().isVisible());
check('任务被设为当前', (await page.locator('.task-row[data-active="true"]').count()) > 0);

await page.getByRole('button', { name: '设置' }).first().click();
await page.getByRole('button', { name: '深色' }).click();
check('深色主题生效', (await page.locator('html').getAttribute('data-theme')) === 'dark');

await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole('button', { name: '计时' }).first().click();
await page.waitForTimeout(400);
const overflow = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
}));
check('移动端无横向溢出', overflow.scrollWidth <= overflow.innerWidth, JSON.stringify(overflow));

check('无控制台错误', errors.length === 0, errors.join(' | '));
await browser.close();

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exit(1);
