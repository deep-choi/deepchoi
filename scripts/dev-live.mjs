import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Serves the built site locally against the production D1 database and R2 bucket,
// read-only: functions/_middleware.ts rejects every API write while READ_ONLY_PREVIEW is set.
// wrangler.toml only carries `remote = true` while this script runs.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const configPath = path.join(rootDir, 'wrangler.toml');
const backupPath = path.join(rootDir, '.wrangler', 'wrangler.toml.before-dev-live');
const port = process.env.PORT || '8789';

// A previous run that was killed hard may have left the remote config in place.
if (existsSync(backupPath)) {
  writeFileSync(configPath, readFileSync(backupPath));
  unlinkSync(backupPath);
}

const original = readFileSync(configPath, 'utf8');
const bucketName = original.match(/^bucket_name\s*=\s*"([^"]+)"/m)?.[1];
if (!bucketName) throw new Error('wrangler.toml has no R2 bucket_name');

const live = original
  .replace(/^(database_id\s*=.*)$/m, '$1\nremote = true')
  .replace(/^preview_bucket_name\s*=.*$/m, `preview_bucket_name = "${bucketName}"\nremote = true`);

writeFileSync(backupPath, original);
writeFileSync(configPath, live);

let restored = false;
const restore = () => {
  if (restored) return;
  restored = true;
  writeFileSync(configPath, original);
  if (existsSync(backupPath)) unlinkSync(backupPath);
};

const child = spawn('npx', ['wrangler', 'pages', 'dev', 'dist', '--port', port, '--binding', 'READ_ONLY_PREVIEW=1'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    child.kill(signal);
    restore();
    process.exit(130);
  });
}

child.on('exit', (code) => {
  restore();
  process.exit(code ?? 0);
});
