export default {
    testEnvironment: 'node',
    // No transform needed — Node handles ESM natively with --experimental-vm-modules
    transform: {},
    // Collect coverage from source files (excluding migrations and seeds)
    collectCoverageFrom: [
        'routes/**/*.js',
        'middleware/**/*.js',
        'lib/**/*.js',
        // Exclude specific files without tests yet
        '!routes/admin.routes.js',
        '!routes/amrresistancegenes.routes.js',
        '!routes/bulk-upload.routes.js',
        '!routes/metagenomic.routes.js',
        '!routes/mockdata.routes.js',
        '!routes/virulencegenes.routes.js',
        '!routes/wgs.routes.js',
        '!lib/db.js',
        '!lib/file-parser.js',
        '!lib/prisma.js',
    ],
    // Coverage output formats
    coverageReporters: ['text', 'text-summary', 'json', 'lcov'],
    // Coverage directory
    coverageDirectory: 'coverage',
    // Coverage thresholds
    // Starting thresholds (will increase as test coverage improves)
    coverageThreshold: {
        global: {
            branches: 15,
            functions: 25,
            lines: 25,
            statements: 25,
        },
    },
    // Where to look for tests
    testMatch: ['**/tests/**/*.test.js'],
    // Verbose output
    verbose: true,
}
