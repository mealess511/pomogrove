import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '..');
const buildDir = path.join(root, 'build');
const sizes = [16, 24, 32, 48, 64, 128, 256, 512];

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

const chrome = chromeCandidates.find((candidate) => fs.existsSync(candidate));
if (!chrome) {
  throw new Error('Chrome/Edge not found. Set CHROME_PATH to a Chromium executable.');
}

const iconSvg = fs.readFileSync(path.join(buildDir, 'icon.svg'), 'utf8');
const traySvg = fs.readFileSync(path.join(buildDir, 'tray.svg'), 'utf8');

const browser = await chromium.launch({ executablePath: chrome, headless: true });

async function renderSvg(svg, size, output) {
  const page = await browser.newPage({
    viewport: { width: Math.max(512, size), height: Math.max(512, size) },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:transparent}
svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
    { waitUntil: 'load' },
  );
  await page.screenshot({
    path: output,
    clip: { x: 0, y: 0, width: size, height: size },
    omitBackground: true,
  });
  await page.close();
  if (!fs.existsSync(output)) {
    throw new Error(`Chrome did not write ${output}`);
  }
}

function packIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + images.length * 16;
  images.forEach(({ data, size }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(entry);
  });
  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]);
}

const pngBySize = new Map();
for (const size of sizes) {
  const output = path.join(buildDir, `icons-${size}.png`);
  await renderSvg(iconSvg, size, output);
  pngBySize.set(size, output);
  if (size === 512) fs.copyFileSync(output, path.join(buildDir, 'icon.png'));
}

for (const size of [16, 32, 64]) {
  await renderSvg(traySvg, size, path.join(buildDir, `tray-${size}.png`));
}
fs.copyFileSync(path.join(buildDir, 'tray-32.png'), path.join(buildDir, 'tray.png'));

const icoSizes = [16, 24, 32, 48, 64, 128, 256];
fs.writeFileSync(
  path.join(buildDir, 'icon.ico'),
  packIco(icoSizes.map((size) => ({ size, data: fs.readFileSync(pngBySize.get(size)) }))),
);

for (const size of sizes) {
  if (size !== 512) fs.rmSync(pngBySize.get(size), { force: true });
}
for (const size of [16, 64]) {
  fs.rmSync(path.join(buildDir, `tray-${size}.png`), { force: true });
}

console.log('Generated build/icon.png, build/icon.ico, build/tray.png');
await browser.close();
