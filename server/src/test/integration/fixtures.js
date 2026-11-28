import { prisma } from '../../config/prisma.js';
import { hashPassword } from '../../utils/password.js';

export const TEST_PASSWORD = 'TestPassw0rd!2026';

export async function makeBranch(name) {
    return prisma.branch.create({
        data: { name, address: `عنوان ${name}`, phone: null, isActive: true },
    });
}

export async function makeUser({
    name,
    phone,
    role,
    branchIds = [],
    password = TEST_PASSWORD,
    isActive = true,
}) {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
        data: { name, phone, username: null, passwordHash, role, isActive },
    });
    if (branchIds.length) {
        await prisma.userBranch.createMany({
            data: branchIds.map((branchId) => ({ userId: user.id, branchId })),
        });
    }
    return user;
}

export async function loginToken(app, request, user, password = TEST_PASSWORD) {
    const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: user.phone, password });
    return res.body?.data?.accessToken;
}
