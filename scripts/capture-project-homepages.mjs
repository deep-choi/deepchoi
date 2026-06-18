import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portfolioRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(portfolioRoot, '..');
const outputDir = path.join(portfolioRoot, 'public', 'captures', 'company-projects');
const logDir = path.join(outputDir, '_playwright-logs');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const apps = [
  { name: 'humanpartner', dir: 'humanparter', port: 5301, urlPath: '/' },
  { name: 'humanpartner-sign', externalUrl: 'https://humanpartner-sign.web.app/' },
  { name: 'micepartner', dir: 'micepartner', port: 5303, urlPath: '/' },
  { name: 'rentalpartner', externalUrl: 'https://rentalpartner.kr/' },
  { name: 'miceday', externalUrl: 'https://miceday.co.kr/' },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForUrl(url, proc) {
  for (let i = 0; i < 90; i += 1) {
    if (proc.exitCode !== null) {
      throw new Error(`preview server exited early with code ${proc.exitCode}`);
    }

    try {
      const response = await fetch(url);
      if (response.status >= 200 && response.status < 500) return;
    } catch {
      // Keep waiting while Vite preview starts.
    }

    await sleep(500);
  }

  throw new Error(`timed out waiting for ${url}`);
}

async function startPreview(app) {
  const cwd = path.join(workspaceRoot, app.dir);
  const out = createWriteStream(path.join(logDir, `${app.name}.out.log`));
  const err = createWriteStream(path.join(logDir, `${app.name}.err.log`));
  const proc = spawn(
    'cmd.exe',
    ['/c', 'npm', 'run', 'preview', '--', '--host', '127.0.0.1', '--port', String(app.port), '--strictPort'],
    {
      cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  proc.stdout.pipe(out);
  proc.stderr.pipe(err);
  proc.once('exit', async () => {
    out.end();
    err.end();
  });

  return proc;
}

async function capture(app, browser) {
  const url = app.externalUrl || `http://127.0.0.1:${app.port}${app.urlPath}`;
  const page = await browser.newPage({ viewport: { width: 1440, height: 1300 } });
  const messages = [];

  page.on('console', (message) => {
    messages.push(`[${message.type()}] ${message.text()}`);
  });
  page.on('pageerror', (error) => {
    messages.push(`[pageerror] ${error.stack || error.message}`);
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(5000);

  const closeText = page.getByText('닫기', { exact: false });
  const closeCount = await closeText.count().catch(() => 0);
  for (let index = closeCount - 1; index >= 0; index -= 1) {
    const item = closeText.nth(index);
    if (await item.isVisible().catch(() => false)) {
      await item.click({ timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(500);
    }
  }

  const info = await page.evaluate(() => ({
    title: document.title,
    bodyText: document.body.innerText.slice(0, 700),
    rootChildren: document.getElementById('root')?.children.length ?? 0,
    bodyBg: getComputedStyle(document.body).backgroundColor,
  }));

  const screenshotPath = path.join(outputDir, `${app.name}-home-desktop.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  await fs.writeFile(
    path.join(logDir, `${app.name}.browser.log`),
    JSON.stringify({ url, info, messages: messages.slice(-80) }, null, 2),
    'utf8',
  );
  await page.close();

  const stat = await fs.stat(screenshotPath);
  return { screenshotPath, bytes: stat.size, info, messages };
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(logDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });

  const results = [];
  try {
    for (const app of apps) {
      let proc;
      try {
        if (!app.externalUrl) {
          proc = await startPreview(app);
          const url = `http://127.0.0.1:${app.port}${app.urlPath}`;
          await waitForUrl(url, proc);
        }

        const result = await capture(app, browser);
        results.push({
          name: app.name,
          bytes: result.bytes,
          title: result.info.title,
          rootChildren: result.info.rootChildren,
          bodyPreview: result.info.bodyText.slice(0, 120),
          errors: result.messages.filter((message) => message.includes('[pageerror]')).length,
        });
      } finally {
        if (proc && !proc.killed) {
          proc.kill('SIGTERM');
          await sleep(800);
        }
      }
    }
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
