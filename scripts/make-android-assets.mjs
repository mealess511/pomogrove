import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '..');
const androidRes = path.join(root, 'android', 'app', 'src', 'main', 'res');
if (!fs.existsSync(androidRes)) {
  throw new Error('android/ is missing. Run `npx cap add android` first.');
}

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);
const chrome = chromeCandidates.find((candidate) => fs.existsSync(candidate));
if (!chrome) throw new Error('Chrome/Edge not found. Set CHROME_PATH.');

const iconSvg = fs.readFileSync(path.join(root, 'build', 'icon.svg'), 'utf8');
const traySvg = fs.readFileSync(path.join(root, 'build', 'tray.svg'), 'utf8');

const browser = await chromium.launch({ executablePath: chrome, headless: true });

async function render(html, width, height, output, background = 'transparent') {
  const page = await browser.newPage({
    viewport: { width: Math.max(512, width), height: Math.max(512, height) },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:${background}}
.stage{display:grid;width:${width}px;height:${height}px;place-items:center}
.stage svg{display:block;width:72%;height:72%}
.full svg{display:block;width:${width}px;height:${height}px}
</style>${html}`,
    { waitUntil: 'load' },
  );
  await page.screenshot({
    path: output,
    clip: { x: 0, y: 0, width, height },
    omitBackground: background === 'transparent',
  });
  await page.close();
  if (!fs.existsSync(output)) throw new Error(`Chrome did not write ${output}`);
}

const legacy = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const foreground = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
const splashes = [
  ['drawable/splash.png', 480, 320],
  ['drawable-land-hdpi/splash.png', 800, 480],
  ['drawable-land-mdpi/splash.png', 480, 320],
  ['drawable-land-xhdpi/splash.png', 1280, 720],
  ['drawable-land-xxhdpi/splash.png', 1600, 960],
  ['drawable-land-xxxhdpi/splash.png', 1920, 1280],
  ['drawable-port-hdpi/splash.png', 480, 800],
  ['drawable-port-mdpi/splash.png', 320, 480],
  ['drawable-port-xhdpi/splash.png', 720, 1280],
  ['drawable-port-xxhdpi/splash.png', 960, 1600],
  ['drawable-port-xxxhdpi/splash.png', 1280, 1920],
];

for (const [density, size] of Object.entries(legacy)) {
  const dir = path.join(androidRes, `mipmap-${density}`);
  fs.mkdirSync(dir, { recursive: true });
  await render(`<div class="full">${iconSvg}</div>`, size, size, path.join(dir, 'ic_launcher.png'));
  fs.copyFileSync(
    path.join(dir, 'ic_launcher.png'),
    path.join(dir, 'ic_launcher_round.png'),
  );
}

for (const [density, size] of Object.entries(foreground)) {
  const dir = path.join(androidRes, `mipmap-${density}`);
  fs.mkdirSync(dir, { recursive: true });
  await render(`<div class="stage">${traySvg}</div>`, size, size, path.join(dir, 'ic_launcher_foreground.png'));
}

for (const [relative, width, height] of splashes) {
  const output = path.join(androidRes, relative);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await render(
    `<div class="stage">${iconSvg}</div>`,
    width,
    height,
    output,
    '#F7F1E7',
  );
}

await browser.close();
console.log('Generated Android launcher icons, adaptive foregrounds and splashes.');
