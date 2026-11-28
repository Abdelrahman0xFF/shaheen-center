import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import 'dotenv/config';

const PG_BIN = process.env.PG_BIN || 'C:\\Program Files\\PostgreSQL\\19\\bin';
const exe = (name) => (process.platform === 'win32' ? `${PG_BIN}\\${name}.exe` : name);

function arg(name) {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? process.argv[i + 1] : null;
}
function has(name) {
    return process.argv.includes(`--${name}`);
}

const file = arg('file');
const targetUrl = arg('target-database-url');
const confirm = has('confirm');
const clean = has('clean');

function fail(msg) {
    console.error(`restore-db: ${msg}`);
    process.exit(1);
}

// 1. --confirm
if (!confirm) fail('refusing without --confirm');
// 2. --file
if (!file || !fs.existsSync(file)) fail('--file must point to an existing dump');
// 3. --target-database-url
if (!targetUrl) fail('--target-database-url is required');

// 4. target must NOT equal DATABASE_URL
if (process.env.DATABASE_URL && targetUrl === process.env.DATABASE_URL) {
    fail('target must not equal DATABASE_URL');
}

let u;
try {
    u = new URL(targetUrl);
} catch {
    fail('target-database-url is not a valid URL');
}

const dbName = u.pathname.replace(/^\//, '');
// 5. target name guard
if (!/_test$|_restore_test$/.test(dbName))
    fail(`target database '${dbName}' must end with _test or _restore_test`);
// 6. host local or allowlisted
const allowedHosts = new Set([
    'localhost',
    '127.0.0.1',
    '::1',
    ...(process.env.RESTORE_ALLOWED_HOSTS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
]);
if (!allowedHosts.has(u.hostname)) fail(`host '${u.hostname}' is not local or allowlisted`);

// 7. PGDMP magic
const head = Buffer.alloc(5);
const fd = fs.openSync(file, 'r');
fs.readSync(fd, head, 0, 5, 0);
fs.closeSync(fd);
if (head.toString('ascii') !== 'PGDMP') fail('not a pg_dump custom archive');

// 8. checksum
const shaPath = `${file}.sha256`;
if (fs.existsSync(shaPath)) {
    const expected = fs.readFileSync(shaPath, 'utf8').split(/\s+/)[0];
    const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (expected !== actual) fail('SHA-256 checksum mismatch');
}

const env = {
    ...process.env,
    PGHOST: u.hostname || 'localhost',
    PGPORT: u.port || '5432',
    PGUSER: decodeURIComponent(u.username || ''),
    PGPASSWORD: decodeURIComponent(u.password || ''),
    PGDATABASE: dbName,
};

// 9. pg_restore --list before touching target
const list = spawnSync(exe('pg_restore'), ['--list', file], { stdio: 'inherit', env });
if (list.status !== 0) fail('pg_restore --list failed');

const restoreArgs = ['--no-owner', '--no-privileges', `--dbname=${dbName}`];
if (clean) restoreArgs.push('--clean', '--if-exists');
restoreArgs.push(file);

const res = spawnSync(exe('pg_restore'), restoreArgs, { stdio: 'inherit', env });
if (res.status !== 0) fail('pg_restore failed');

console.log(`restore-db OK -> ${dbName}`);
