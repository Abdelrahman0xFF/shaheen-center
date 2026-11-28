import { prisma } from '../../config/prisma.js';

/** Truncate every table with CASCADE for a clean test slate. */
export async function resetDb() {
    const tables = await prisma.$queryRaw`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
    `;
    const names = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
    if (names) await prisma.$executeRawUnsafe(`TRUNCATE ${names} RESTART IDENTITY CASCADE`);
}

export async function closeDb() {
    await prisma.$disconnect();
}
