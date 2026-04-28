export default {
    testEnvironment: 'node',
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
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
    // Keep statement/line/function coverage high while using a realistic branch floor
    // for route validators, upload guards, and schema fallback paths.
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 95,
            lines: 95,
            statements: 95,
        },
    },
    // Where to look for tests
    testMatch: ['**/tests/**/*.test.js'],
    // Verbose output
    verbose: true,
}
