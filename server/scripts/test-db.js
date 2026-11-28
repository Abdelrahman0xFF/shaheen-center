import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import 'dotenv/config';

const PG_BIN = process.env.PG_BIN || 'C:\\Program Files\\PostgreSQL\\19\\bin';
const exe = (name) => (process.platform === 'win32' ? `${PG_BIN}\\${name}.exe` : name);
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TEST_DATABASE_URL =
    process.env.TEST_DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/shaheen_center_test?schema=public';

function parseDbName(url) {
    try {
        return new URL(url).pathname.replace(/^\//, '');
    } catch {
        return '';
    }
}

function assertTestDb(url) {
    const name = parseDbName(url);
    if (!name.endsWith('_test')) {
        throw new Error(`Refusing to operate on database '${name}': name must end with _test`);
    }
    return name;
}

function pgEnv(url) {
    const u = new URL(url);
    return {
        PGHOST: u.hostname || 'localhost',
        PGPORT: u.port || '5432',
        PGUSER: decodeURIComponent(u.username || ''),
        PGPASSWORD: decodeURIComponent(u.password || ''),
        PGDATABASE: 'postgres',
    };
}

function run(cmd, args, extraEnv = {}) {
    const res = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...extraEnv } });
    if (res.status !== 0) process.exit(res.status || 1);
}

function runNpx(args, extraEnv = {}) {
    const res = spawnSync(NPX, args, {
        stdio: 'inherit',
        env: { ...process.env, ...extraEnv },
        cwd: SERVER_ROOT,
        shell: process.platform === 'win32',
    });
    if (res.status !== 0) process.exit(res.status || 1);
}

const action = process.argv[2] || 'reset';
const name = assertTestDb(TEST_DATABASE_URL);
const env = pgEnv(TEST_DATABASE_URL);

switch (action) {
    case 'create':
        run(exe('createdb'), [name], env);
        break;
    case 'migrate':
        runNpx(['prisma', 'migrate', 'deploy'], { DATABASE_URL: TEST_DATABASE_URL });
        break;
    case 'drop':
        run(exe('dropdb'), ['--if-exists', name], env);
        break;
    case 'reset':
        run(exe('dropdb'), ['--if-exists', name], env);
        run(exe('createdb'), [name], env);
        runNpx(['prisma', 'migrate', 'deploy'], { DATABASE_URL: TEST_DATABASE_URL });
        break;
    default:
        console.error(`Unknown action: ${action}`);
        process.exit(1);
}

console.log(`test-db ${action} OK (database ends with _test)`);
