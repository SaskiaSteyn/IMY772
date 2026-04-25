export default {
    testEnvironment: 'node',
    // No transform needed — Node handles ESM natively with --experimental-vm-modules
    transform: {},
    // Collect coverage from source files (excluding migrations and seeds)
    collectCoverageFrom: [
        'routes/**/*.js',
        'middleware/**/*.js',
        'lib/**/*.js',
        '!lib/prisma.js',
    ],
    // Where to look for tests
    testMatch: ['**/tests/**/*.test.js'],
    // Verbose output
    verbose: true,
}
