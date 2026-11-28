import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();
let exitCode = 0;

async function main() {
    const phone = (process.env.ADMIN_PHONE || '').trim();
    const password = process.env.ADMIN_PASSWORD || '';

    if (!phone || !password) {
        console.log('Admin Verification\n');
        console.log('ADMIN_PHONE and ADMIN_PASSWORD must be set in server/.env.');
        exitCode = 1;
        return;
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    const accountExists = Boolean(user);
    const correctRole = user?.role === Role.ADMIN;
    const accountActive = user?.isActive === true;
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;
    const allPassed = accountExists && correctRole && accountActive && passwordMatches;

    console.log('Admin Verification\n');
    console.log(`accountExists: ${accountExists}`);
    console.log(`correctRole: ${correctRole}`);
    console.log(`accountActive: ${accountActive}`);
    console.log(`passwordMatches: ${passwordMatches}`);
    console.log('');
    console.log(allPassed ? 'All Admin tests passed.' : 'Admin verification failed.');

    exitCode = allPassed ? 0 : 1;
}

main()
    .catch((err) => {
        console.error('Admin verification error:', err.message);
        exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
        process.exitCode = exitCode;
    });
