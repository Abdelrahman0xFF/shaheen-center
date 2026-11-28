import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.js'],
        exclude: ['src/**/*.integration.test.js'],
        setupFiles: ['src/test/setup.js'],
        clearMocks: true,
        restoreMocks: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            include: ['src/**/*.js'],
            exclude: ['src/test/**', 'src/**/*.test.js', 'src/**/*.integration.test.js'],
        },
    },
});
