import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.integration.test.js'],
        setupFiles: ['src/test/setup.js', 'src/test/integration-setup.js'],
        globalSetup: ['src/test/integration-global-setup.js'],
        clearMocks: true,
        restoreMocks: true,
        fileParallelism: false,
        pool: 'forks',
        testTimeout: 30000,
    },
});
