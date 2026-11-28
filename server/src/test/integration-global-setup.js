import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx';

export default function () {
    const url = process.env.TEST_DATABASE_URL;
    if (!url) {
        if (process.env.CI === '1' || process.env.CI === 'true') {
            throw new Error('TEST_DATABASE_URL is required in CI for integration tests.');
        }
        console.warn('[integration] TEST_DATABASE_URL not set; skipping DB migrate.');
        return;
    }

    let name = '';
    try {
        name = new URL(url).pathname.replace(/^\//, '');
    } catch {
        throw new Error('TEST_DATABASE_URL is not a valid URL.');
    }
    if (!name.endsWith('_test')) {
        throw new Error(
            `Refusing integration tests on database '${name}': name must end with _test.`,
        );
    }

    const res = spawnSync(NPX, ['prisma', 'migrate', 'deploy'], {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: url },
        cwd: SERVER_ROOT,
        shell: process.platform === 'win32',
    });
    if (res.status !== 0) throw new Error('prisma migrate deploy failed for test DB.');
}
