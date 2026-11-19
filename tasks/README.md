# لوحة متابعة مهام الفريق — مشروع سنتر شاهين (MVP)

كل فرد يحدّث علامات الإنجاز (`- [x]`) في ملف مهامه مع كل PR يتم دمجه في `main`.

| الفرد                 | الدور / النطاق (MVP)                                                           | ملف المهام                     |
| :-------------------- | :----------------------------------------------------------------------------- | :----------------------------- |
| **Member 1 — Ezzat**  | المصادقة، الصلاحيات، الفروع والقاعات، التقويم، الإعدادات، سجل المراقبة         | [01-ezzat.md](./01-ezzat.md)   |
| **Member 2 — George** | المدرسون، المواد، المجموعات، كشف التعارض، توليد وإدارة الحصص                   | [02-george.md](./02-george.md) |
| **Member 3 — Marco**  | الطلاب، تشفير الرقم القومي، كروت الـ QR، التسكين والنقل، ملف الطالب            | [03-marco.md](./03-marco.md)   |
| **Member 4 — Mazen**  | محرك مسح الـ QR، شاشة الاستقبال، التحضير اليدوي، كشوف الحضور وإغلاق الحصة      | [04-mazen.md](./04-mazen.md)   |
| **Member 5 — 3ATEF**  | المدفوعات والإيصالات، تقفيل اليومية، سجل الرسائل والقوالب، لوحة التحكم المصغّرة | [05-atef.md](./05-atef.md)     |

---

## نقاط التكامل الحرجة بين الفريق (MVP Integration Seams)

1. **M1 → الجميع:** تشغيل أول Migration (`init_mvp_schema`) + `seed.js` + إنهاء `POST /api/auth/login` وربط `ProtectedRoute`.
2. **M5 → M2 & M4:** دالة `enqueueNotification()` جاهزة مبدئياً في `server/src/services/notifications.service.js` (تُستخدم عند حضور/غياب الطالب أو إلغاء حصة).
3. **M5 → M4:** دالة `getStudentSubscriptionStatus(studentId, courseId)` جاهزة مبدئياً في `server/src/services/payments.service.js` + مكون `<QuickPaymentModal />` لزر "تحصيل اشتراك" في شاشة الاستقبال.
4. **M3 ↔ M4:** جدول `Student` (`qrToken`, `photoUrl`, `deletedAt`) و `Enrollment` (`status: ACTIVE`) يُقرآن في كل مسحة QR في أقل من ثانية (`AC-01`).
