import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';

const PG_BIN = process.env.PG_BIN || 'C:\\Program Files\\PostgreSQL\\19\\bin';
const exe = (name) => (process.platform === 'win32' ? `${PG_BIN}\\${name}.exe` : name);
const BACKUP_DIR = process.env.BACKUP_DIR || path.resolve(process.cwd(), 'backups');
const RETENTION_DAYS = Number.parseInt(process.env.BACKUP_RETENTION_DAYS || '14', 10);

function pgEnv(url) {
    const u = new URL(url);
    return {
        PGHOST: u.hostname || 'localhost',
        PGPORT: u.port || '5432',
        PGUSER: decodeURIComponent(u.username || ''),
        PGPASSWORD: decodeURIComponent(u.password || ''),
        PGDATABASE: u.pathname.replace(/^\//, '') || 'postgres',
    };
}

function sha256File(file) {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error('DATABASE_URL is required (not printed).');
    process.exit(1);
}

const started = Date.now();
fs.mkdirSync(BACKUP_DIR, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const file = path.join(BACKUP_DIR, `shaheen-${stamp}.dump`);

// Preflight
const ver = spawnSync(exe('pg_dump'), ['--version'], { stdio: 'inherit' });
if (ver.status !== 0) {
    console.error(`pg_dump not found; set PG_BIN. Tried: ${exe('pg_dump')}`);
    process.exit(1);
}

const dump = spawnSync(
    exe('pg_dump'),
    ['--format=custom', '--no-owner', '--no-privileges', `--file=${file}`],
    { stdio: 'inherit', env: { ...process.env, ...pgEnv(databaseUrl) } },
);

if (dump.status !== 0) {
    console.error('pg_dump failed.');
    process.exit(1);
}

const checksum = sha256File(file);
fs.writeFileSync(`${file}.sha256`, `${checksum}  ${path.basename(file)}\n`);

// Retention (after successful backup)
if (Number.isFinite(RETENTION_DAYS) && RETENTION_DAYS > 0) {
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const name of fs.readdirSync(BACKUP_DIR)) {
        if (!name.endsWith('.dump')) continue;
        const p = path.join(BACKUP_DIR, name);
        try {
            if (fs.statSync(p).mtimeMs < cutoff) {
                fs.rmSync(p, { force: true });
                fs.rmSync(`${p}.sha256`, { force: true });
            }
        } catch {
            /* ignore */
        }
    }
}

const size = fs.statSync(file).size;
console.log(
    JSON.stringify({
        file: path.basename(file),
        size,
        durationMs: Date.now() - started,
        checksumPrefix: checksum.slice(0, 12),
    }),
);

// Optional encryption if gpg + passphrase available
if (process.env.BACKUP_ENCRYPTION_PASSPHRASE) {
    const gpg = spawnSync(
        'gpg',
        [
            '--batch',
            '--yes',
            '--symmetric',
            '--cipher-algo',
            'AES256',
            '--passphrase',
            process.env.BACKUP_ENCRYPTION_PASSPHRASE,
            `--output`,
            `${file}.gpg`,
            file,
        ],
        { stdio: 'inherit' },
    );
    if (gpg.status === 0) console.log(`encrypted: ${path.basename(file)}.gpg`);
    else console.warn('gpg encryption skipped (gpg not available or failed).');
}
