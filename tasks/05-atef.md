# مهام الفرد الخامس (Member 5 — 3ATEF)

**النطاق (MVP):** `Payments & Receipts (No Hard Delete)` + `Subscription Status` + `Quick Payment Modal` + `Daily Cash Closing` + `Notification Log & Templates` + `Lite Admin Dashboard`

## الملفات الخاصة بك

- **Backend:**
    - `server/src/routes/{payments,closings,notifications,dashboard}.routes.js`
    - `server/src/controllers/{payments,closings,notifications,dashboard}.controller.js`
    - `server/src/services/{payments,closings,notifications,dashboard}.service.js`
- **Frontend:**
    - `client/src/pages/finance/{DashboardPage,PaymentsPage,DailyClosingPage,MessagesPage}.jsx`
    - مكون مشترك للاستقبال والملف: `client/src/components/QuickPaymentModal.jsx` (يستدعيه Member 4 و Member 3)

---

## 1. الواجهة الخلفية — MVP (Backend)

- [ ] **المدفوعات والاشتراكات (`FR-PAY-01`, `02`, `03`, `06`, `08`):**
    - [ ] تنفيذ `POST /api/payments`: تسجيل دفعة جديدة (`Decimal`)، توليد `receiptNo` فريد (مثل `RCP-20261119-0001`)، تحديد فترة الاشتراك (`periodStart`, `periodEnd`, `sessionsCount`)، تسجيل `logAudit()`، وإرسال إيصال عبر `enqueueNotification()`.
    - [ ] تنفيذ `GET /api/payments` (بحث برقم الإيصال أو اسم الطالب + فلترة بالفرع/الوسيلة/التاريخ + Pagination + احترام `req.branchScope`).
    - [ ] تنفيذ `GET /api/payments/:id/receipt` لبيانات طباعة/إعادة طباعة الإيصال.
    - [ ] تنفيذ `POST /api/payments/:id/void`: عكس/إلغاء القيد بضبط `status = 'VOIDED'`, `voidedAt`, `voidReason`, `voidedById` مع `logAudit()` — **ممنوع الحذف النهائي (`FR-PAY-08`)**.
    - [ ] مراجعة وإكمال `getStudentSubscriptionStatus(studentId, courseId)` و `GET /api/payments/students/:studentId/subscription` لخدمة شاشة الاستقبال.
- [ ] **تقفيل اليومية (`FR-PAY-07`):**
    - [ ] تنفيذ `GET /api/closings/preview`: تجميع مدفوعات اليوم غير المقفولة للسكرتير الحالي حسب وسيلة الدفع (`CASH`, `VODAFONE_CASH`, `INSTAPAY`, `CARD`).
    - [ ] تنفيذ `POST /api/closings`: إنشاء `CashClosing` مقفول (`isLocked: true`, `lockedAt: now`) وربط المدفوعات به عبر `cashClosingId` داخل Transaction مع `logAudit()`.
    - [ ] تنفيذ `GET /api/closings`: عرض سجل اليوميات المقفولة.
- [ ] **سجل الرسائل والقوالب (`FR-NTF-03`, `11`, `13` — بدون Redis/BullMQ في الـ MVP):**
    - [ ] مراجعة `enqueueNotification()` في `notifications.service.js` وإكمال `GET /api/notifications` (فلترة بالطالب/النوع/الحالة + Pagination).
    - [ ] تنفيذ `GET/PATCH /api/notifications/templates` للسماح للأدمن بتعديل قوالب الرسائل العربية (`{{studentName}}`, `{{amount}}`, `{{time}}`, إلخ).
- [ ] **لوحة التحكم المصغّرة (`FR-ADM-10` lite):**
    - [ ] تنفيذ `GET /api/dashboard/summary` لإرجاع: إجمالي الطلاب النشطين، حضور اليوم، إيراد اليوم والشهر (`EGP`)، وقائمة حصص اليوم (مع احترام `req.branchScope`).

## 2. الواجهة الأمامية — MVP (Frontend)

- [ ] بناء مكون **`QuickPaymentModal.jsx`** المشترك (اختيار الكورس، المبلغ، وسيلة الدفع، فترة الاشتراك → حفظ وطباعة الإيصال مباشرة) لاستخدامه في شاشة الاستقبال (Member 4) وملف الطالب (Member 3).
- [ ] بناء شاشة `PaymentsPage.jsx`: جدول المدفوعات، زر إلغاء قيد (مع سبب)، ومكون طباعة الإيصال بكلاسي `.print-thermal-80mm` و A4 (`FR-PAY-02`).
- [ ] بناء شاشة `DailyClosingPage.jsx`: عرض معاينة متحصلات اليوم حسب وسيلة الدفع وزر **"تأكيد وقفل اليومية"** وسجل اليوميات السابقة.
- [ ] بناء شاشة `MessagesPage.jsx`: عرض سجل الرسائل المرسلة/المعلقة + تبويب تعديل قوالب الرسائل العربية.
- [ ] بناء شاشة `DashboardPage.jsx` (`UI-04` lite): بطاقات الإحصائيات + جدول حصص اليوم + أزرار وصول سريع.

## 3. التحقق قبل الإغلاق (Acceptance Checks)

- [ ] دفع اشتراك طالب يغيّر حالته فوراً في شاشة الاستقبال من **أحمر (مستحق)** إلى **أخضر (مدفوع)** ويسجل رسالة إيصال في `Notification`.
- [ ] لا يمكن تعديل أو إعادة تقفيل يومية بعد تأكيد قفلها (`FR-PAY-07`).

---

## مهام مؤجلة لما بعد الـ MVP (Post-MVP Backlog)

- [ ] تشغيل **BullMQ + Redis Worker** وإرسال فعلي عبر **Zagel API** مع Exponential Backoff (`FR-NTF-02`, `AC-03`).
- [ ] Cron Jobs لتذكيرات الدفع والتقارير الأسبوعية/الشهرية (`FR-NTF-06`, `08`).
- [ ] خطط الأسعار والخصومات (`FR-PAY-04`) والمتأخرات (`Receivables Aging` `FR-PAY-05`).
- [ ] المصروفات (`FR-ADM-05`) ومستحقات المدرسين (`FR-INS-04..06`, `FR-ADM-06`).
- [ ] مقارنة الفروع (`UI-08`, `FR-ADM-04`) وتصدير التقارير `Excel / PDF` (`FR-RPT-01`).
