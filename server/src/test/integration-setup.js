// Runs before each test file: point Prisma at the disposable test DB.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
