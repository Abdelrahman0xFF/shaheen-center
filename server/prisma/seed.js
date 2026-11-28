import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();
const ADMIN_PASSWORD_MIN_LENGTH = 12;

/**
 * Reads and validates the initial Admin credentials from the environment.
 * Never logs or returns the plaintext password outside this module.
 */
function readAdminConfig() {
    const name = (process.env.ADMIN_NAME || '').trim();
    const phone = (process.env.ADMIN_PHONE || '').trim();
    const password = process.env.ADMIN_PASSWORD || '';

    const missing = [];
    if (!name) missing.push('ADMIN_NAME');
    if (!phone) missing.push('ADMIN_PHONE');
    if (!password) missing.push('ADMIN_PASSWORD');

    if (missing.length > 0) {
        throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
    }

    if (password.length < ADMIN_PASSWORD_MIN_LENGTH) {
        throw new Error(
            `ADMIN_PASSWORD must be at least ${ADMIN_PASSWORD_MIN_LENGTH} characters long.`,
        );
    }

    return { name, phone, password };
}

/**
 * Creates the initial ADMIN account once. Existing accounts are never modified,
 * so re-running the seed cannot reset an administrator's credentials.
 */
async function seedAdmin({ name, phone, password }) {
    const existing = await prisma.user.findUnique({ where: { phone } });

    if (existing) {
        if (existing.role !== Role.ADMIN) {
            throw new Error(
                `ADMIN_PHONE is already assigned to an account with role ${existing.role}; refusing to create a duplicate ADMIN.`,
            );
        }

        console.log('Admin account already exists (role ADMIN). No changes made.');
        return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
        data: {
            name,
            phone,
            passwordHash,
            role: Role.ADMIN,
            isActive: true,
            failedLoginAttempts: 0,
        },
    });

    console.log('Admin account created (role ADMIN).');
}

async function main() {
    console.log('Seeding Shaheen Center MVP database...');

    // 1. Initial Admin account (FR-AUTH-01, FR-AUTH-05)
    const adminConfig = readAdminConfig();
    await seedAdmin(adminConfig);

    // 2. Default Main Branch & Room
    let mainBranch = await prisma.branch.findFirst({ where: { name: 'الفرع الرئيسي' } });
    if (!mainBranch) {
        mainBranch = await prisma.branch.create({
            data: {
                name: 'الفرع الرئيسي',
                address: 'القاهرة - مدينة نصر',
                phone: '01000000001',
                rooms: {
                    create: [
                        { name: 'قاعة 1', capacity: 30 },
                        { name: 'قاعة 2', capacity: 25 },
                    ],
                },
            },
        });
    }

    // 3. Default System Settings (FR-ADM-07, NFR-MNT-03)
    const defaultSettings = [
        {
            key: 'late_threshold_minutes',
            value: '15',
            description: 'حد التأخير بالدقائق بعد بداية الحصة',
        },
        {
            key: 'absence_alert_minutes',
            value: '15',
            description: 'الوقت بالدقائق قبل تسجيل الغياب وإرسال التنبيه',
        },
        {
            key: 'working_days',
            value: '0,1,2,3,4,6',
            description: 'أيام العمل الأسبوعية (0=الأحد .. 6=السبت)',
        },
        {
            key: 'center_name',
            value: 'سنتر شاهين التعليمي',
            description: 'اسم السنتر الظاهر في الإيصالات والكروت',
        },
        { key: 'currency', value: 'EGP', description: 'العملة الافتراضية' },
        { key: 'timezone', value: 'Africa/Cairo', description: 'المنطقة الزمنية للعرض' },
    ];

    for (const setting of defaultSettings) {
        await prisma.setting.upsert({
            where: { key: setting.key },
            update: {},
            create: setting,
        });
    }

    // 4. Default Arabic WhatsApp Message Templates (FR-NTF-11)
    const defaultTemplates = [
        {
            code: 'ARRIVAL_AR',
            type: NotificationType.ARRIVAL,
            language: 'ar',
            title: 'إشعار حضور الطالب',
            body: 'ولي أمر الطالب {{studentName}}، نحيطكم علماً بحضور نجلكم حصة {{courseName}} اليوم الساعة {{time}} في سنتر شاهين.',
        },
        {
            code: 'ABSENCE_AR',
            type: NotificationType.ABSENCE,
            language: 'ar',
            title: 'تنبيه غياب الطالب',
            body: 'ولي أمر الطالب {{studentName}}، نحيطكم علماً بتغيب نجلكم عن حصة {{courseName}} اليوم ({{date}}).',
        },
        {
            code: 'PAYMENT_RECEIPT_AR',
            type: NotificationType.PAYMENT_RECEIPT,
            language: 'ar',
            title: 'إيصال سداد الاشتراك',
            body: 'تم استلام مبلغ {{amount}} ج.م اشتراك الطالب {{studentName}} في {{courseName}}. رقم الإيصال: {{receiptNo}}.',
        },
        {
            code: 'SESSION_CHANGE_AR',
            type: NotificationType.SESSION_CHANGE,
            language: 'ar',
            title: 'تعديل أو إلغاء حصة',
            body: 'تنويه هام لأولياء أمور مجموعة {{groupName}}: {{details}}.',
        },
    ];

    for (const tpl of defaultTemplates) {
        await prisma.messageTemplate.upsert({
            where: { code: tpl.code },
            update: {},
            create: tpl,
        });
    }

    console.log('Seed complete.');
}

main()
    .catch((err) => {
        console.error('Seed error:', err.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
