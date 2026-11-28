import crypto from 'node:crypto';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const PG_BIN = process.env.PG_BIN || 'C:\\Program Files\\PostgreSQL\\19\\bin';
const exe = (name) => (process.platform === 'win32' ? `${PG_BIN}\\${name}.exe` : name);

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
    console.error('Usage: verify-backup <file.dump>');
    process.exit(1);
}

const head = Buffer.alloc(5);
const fd = fs.openSync(file, 'r');
fs.readSync(fd, head, 0, 5, 0);
fs.closeSync(fd);
if (head.toString('ascii') !== 'PGDMP') {
    console.error('Not a pg_dump custom archive (missing PGDMP magic).');
    process.exit(1);
}

const shaPath = `${file}.sha256`;
if (fs.existsSync(shaPath)) {
    const expected = fs.readFileSync(shaPath, 'utf8').split(/\s+/)[0];
    const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (expected !== actual) {
        console.error('SHA-256 mismatch.');
        process.exit(1);
    }
    console.log('checksum OK');
}

const list = spawnSync(exe('pg_restore'), ['--list', file], { stdio: 'inherit' });
if (list.status !== 0) {
    console.error('pg_restore --list failed.');
    process.exit(1);
}
console.log('verify-backup OK');
