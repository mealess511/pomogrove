import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '..');
const outputDir = path.join(root, 'screenshots');
const port = 4173;
const url = `http://127.0.0.1:${port}/`;

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);
const chrome = chromeCandidates.find((candidate) => fs.existsSync(candidate));
if (!chrome) throw new Error('Chrome/Edge not found. Set CHROME_PATH.');

if (!fs.existsSync(path.join(root, 'dist', 'index.html'))) {
  throw new Error('dist/index.html is missing. Run `npm run build` first.');
}
fs.mkdirSync(outputDir, { recursive: true });

const now = Date.now();
const day = 86_400_000;
const tasks = [
  { id: 'task-focus', title: '写完产品需求文档', estimate: 8, completed: 3, done: false },
  { id: 'task-mail', title: '回复本周邮件', estimate: 3, completed: 1, done: false },
  { id: 'task-read', title: '阅读《深度工作》30 页', estimate: 2, completed: 0, done: false },
  { id: 'task-trip', title: '整理旅行照片', estimate: 4, completed: 4, done: true },
  { id: 'task-ts', title: '学习 TypeScript 类型体操', estimate: 6, completed: 2, done: false },
].map((task) => ({
  ...task,
  createdAt: now - 20 * day,
  completedAt: task.done ? now - 2 * day : null,
}));

function pseudo(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const sessions = [];
for (let offset = 44; offset >= 0; offset -= 1) {
  if (pseudo(offset + 3) < 0.22 && offset !== 0) continue;
  const count = offset === 0 ? 4 : 1 + Math.floor(pseudo(offset + 11) * 5);
  for (let index = 0; index < count; index += 1) {
    const endedAt = now - offset * day - (14 - index * 2) * 3_600_000;
    const task = tasks[index % tasks.length];
    sessions.push({
      id: `session-${offset}-${index}`,
      taskId: task.id,
      taskTitle: task.title,
      startedAt: endedAt - 25 * 60_000,
      endedAt,
      minutes: 25,
    });
  }
}

const seedState = {
  state: {
    settings: {
      focusMin: 25,
      shortBreakMin: 5,
      longBreakMin: 15,
      longBreakEvery: 4,
      autoStartBreaks: true,
      autoStartFocus: false,
      dailyGoal: 6,
      theme: 'system',
      completionSound: 'chime',
      volume: 0.65,
      ambience: 'forest',
      ambienceVolume: 0.35,
      notifications: false,
      vibration: true,
      keepAwake: false,
      alwaysOnTop: false,
      autoLaunch: false,
      closeToTray: false,
    },
    tasks,
    sessions,
    activeTaskId: 'task-focus',
    timer: {
      phase: 'focus',
      status: 'idle',
      durationMs: 25 * 60_000,
      remainingMs: 25 * 60_000,
      endAt: null,
      startedAt: null,
      focusesSinceLongBreak: 3,
    },
    view: 'timer',
  },
  version: 1,
};

function waitForServer(target, timeoutMs = 30_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      try {
        const response = await fetch(target);
        if (response.ok) {
          resolve();
          return;
        }
      } catch {
        /* not ready */
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Preview server did not start at ${target}`));
        return;
      }
      setTimeout(attempt, 300);
    };
    void attempt();
  });
}

const server = spawn(
  process.execPath,
  [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
  { cwd: root, stdio: 'ignore' },
);

let browser;
try {
  await waitForServer(url);
  browser = await chromium.launch({
    executablePath: chrome,
    headless: true,
    args: ['--hide-scrollbars', '--force-color-profile=srgb'],
  });

  async function makeContext(viewport, mobile = false, colorScheme = 'light') {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: mobile ? 2 : 1,
      isMobile: mobile,
      hasTouch: mobile,
      colorScheme,
      reducedMotion: 'reduce',
      locale: 'zh-CN',
    });
    await context.addInitScript((state) => {
      localStorage.setItem('pomogrove.store.v1', JSON.stringify(state));
    }, seedState);
    return context;
  }

  async function open(context) {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    return page;
  }

  async function shot(page, name) {
    await page.waitForTimeout(280);
    await page.screenshot({ path: path.join(outputDir, `${name}.png`) });
    console.log(`captured ${name}.png`);
  }

  const desktop = await makeContext({ width: 1440, height: 900 });
  const desktopPage = await open(desktop);
  await shot(desktopPage, 'desktop-timer');
  await desktopPage.locator('.nav-item').filter({ hasText: '任务' }).click();
  await shot(desktopPage, 'desktop-tasks');
  await desktopPage.locator('.nav-item').filter({ hasText: '花园' }).click();
  await shot(desktopPage, 'desktop-garden');
  await desktopPage.locator('.nav-item').filter({ hasText: '设置' }).click();
  await shot(desktopPage, 'desktop-settings');
  await desktop.close();

  const dark = await makeContext({ width: 1440, height: 900 }, false, 'dark');
  const darkPage = await open(dark);
  await shot(darkPage, 'desktop-timer-dark');
  await darkPage.locator('.nav-item').filter({ hasText: '花园' }).click();
  await shot(darkPage, 'desktop-garden-dark');
  await dark.close();

  const mobile = await makeContext({ width: 390, height: 844 }, true);
  const mobilePage = await open(mobile);
  await shot(mobilePage, 'mobile-timer');
  await mobilePage.locator('.mobile-nav button').filter({ hasText: '任务' }).click();
  await shot(mobilePage, 'mobile-tasks');
  await mobilePage.locator('.mobile-nav button').filter({ hasText: '花园' }).click();
  await shot(mobilePage, 'mobile-garden');
  await mobilePage.locator('.mobile-nav button').filter({ hasText: '设置' }).click();
  await shot(mobilePage, 'mobile-settings');
  await mobile.close();
} finally {
  if (browser) await browser.close();
  server.kill();
}
