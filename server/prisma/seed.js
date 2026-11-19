import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Shaheen Center MVP database...');

    // 1. Default Admin account (FR-AUTH-01, FR-AUTH-05)
    const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
    const admin = await prisma.user.upsert({
        where: { phone: '01000000000' },
        update: {},
        create: {
            name: 'مدير النظام (أدمن)',
            phone: '01000000000',
            username: 'admin',
            passwordHash: adminPasswordHash,
            role: Role.ADMIN,
            isActive: true,
        },
    });

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

    console.log(
        `Seed complete. Admin: ${admin.phone} (password: Admin@123) | Branch: ${mainBranch.name}`,
    );
}

main()
    .catch((err) => {
        console.error('Seed error:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
