# مهام الفرد الرابع (Member 4 — Mazen)

**النطاق (MVP):** `QR Attendance Scan Engine (AC-01, AC-02)` + `Manual Attendance` + `Close Session (Mark Absent)` + `Reception Screen (UI-05)` + `Attendance Sheets`

## الملفات الخاصة بك

- **Backend:**
    - `server/src/routes/attendance.routes.js`
    - `server/src/controllers/attendance.controller.js`
    - `server/src/services/attendance.service.js`
- **Frontend:**
    - `client/src/pages/attendance/ReceptionPage.jsx`
    - `client/src/pages/attendance/AttendanceSheetsPage.jsx`

---

## 1. الواجهة الخلفية — MVP (Backend)

- [ ] **محرك مسح الـ QR (`POST /api/attendance/scan` — `FR-ATT-01..05`, `AC-01`, `AC-02`):**
    - [ ] التحقق من صلاحية `qrToken` (طالب نشط `deletedAt: null`) ووجود اشتراك نشط (`Enrollment.status = 'ACTIVE'`) وحصة نشطة اليوم في نفس الفرع (`req.branchScope`).
    - [ ] منع التكرار في نفس الحصة (`One-time-use` عبر قيد `@@unique([sessionId, studentId])` وإرجاع `409 DUPLICATE_SCAN` مع رسالة واضحة).
    - [ ] حساب الحالة (`PRESENT` أو `LATE`) بناءً على إعداد `late_threshold_minutes` في جدول `Setting`.
    - [ ] جلب حالة الاشتراك (`PAID` / `DUE` / `EXPIRED`) عبر `getStudentSubscriptionStatus()` من `payments.service.js`.
    - [ ] تسجيل إشعار الحضور عبر `enqueueNotification()` من `notifications.service.js` بمفتاح `arrival:${sessionId}:${studentId}` بدون إبطاء الرد.
    - [ ] ضمان سرعة الاستجابة في **أقل من 1 ثانية** (`NFR-PERF-01`, `AC-01`).
- [ ] **التحضير اليدوي (`POST /api/attendance/manual` — `FR-ATT-06`):**
    - [ ] السماح للسكرتير أو المدرس بتحضير الطالب يدوياً (نسيان الكارت) مع **إلزامية إدخال السبب** وتسجيله في `logAudit()`.
- [ ] **إغلاق الحصة وتسجيل الغياب (`POST /api/attendance/sessions/:sessionId/close` — بديل الـ Cron في الـ MVP):**
    - [ ] تحديد الطلاب المسجلين في المجموعة (`ACTIVE`) الذين لم يحضروا الحصة، تسجيلهم `ABSENT`، وتحديث حالة الحصة إلى `CLOSED`.
    - [ ] استدعاء `enqueueNotification()` لتنبيه الغياب لكل طالب غائب بمفتاح `absence:${sessionId}:${studentId}` لمنع التكرار (`AC-05`).
- [ ] **كشوف ونسب الحضور (`FR-ATT-08`):**
    - [ ] تنفيذ `GET /api/attendance/sessions/:sessionId` لعرض كشف حضور الحصة بالكامل.
    - [ ] تنفيذ `GET /api/attendance/students/:studentId/summary` لحساب نسبة الحضور لكل كورس ولكل شهر.

## 2. الواجهة الأمامية — MVP (Frontend)

- [ ] **شاشة الاستقبال (`ReceptionPage.jsx` — `UI-05`, `FR-REC-01..05`):**
    - [ ] منطقة مسح مركزية تدعم **قارئ الـ USB Scanner (Keyboard-wedge)** عبر Auto-focused input + دعم **كاميرا الجهاز** (يمكن إضافة `html5-qrcode`).
    - [ ] بطاقة جانبية بارزة تعرض: صورة الطالب، اسمه، مجموعته، وقت المسح، وحالة الحضور + **حالة الدفع بلون وأيقونة ونص (`أخضر = مدفوع`، `أحمر = مستحق`)** مع تنبيه صوتي مميز للنجاح/التحذير/التكرار (`FR-REC-02`, `05`).
    - [ ] أزرار سريعة: **"تحصيل اشتراك"** (يفتح `<QuickPaymentModal />` من Member 5) و **"تحضير يدوي"** (`FR-REC-03`).
- [ ] **شاشة كشوف الحضور (`AttendanceSheetsPage.jsx`):**
    - [ ] اختيار الحصة لعرض قائمة الطلاب وحالاتهم (`حاضر`، `متأخر`، `غائب`، `بعذر`).
    - [ ] أزرار التحضير اليدوي مع السبب وزر **"إغلاق الحصة وتسجيل الغياب"**.

## 3. التحقق قبل الإغلاق (Acceptance Checks)

- [ ] **`AC-01`:** مسح QR صالح يظهر بطاقة الطالب وحالة اشتراكه في أقل من ثانية.
- [ ] **`AC-02`:** إعادة مسح نفس الكارت لنفس الحصة يُرفض بتحذير تكرار ولا ينشئ سجلاً جديداً.

---

## مهام مؤجلة لما بعد الـ MVP (Post-MVP Backlog)

- [ ] العمل بدون إنترنت (`IndexedDB` + Sync عند عودة الاتصال `FR-ATT-09`, `NFR-REL-03`).
- [ ] Cron Job آلي للغياب بعد 15 دقيقة من بداية الحصة (`AC-05`).
- [ ] طلبات الأعذار والحصص التعويضية (`FR-ATT-10`).
- [ ] موديول الامتحانات والدرجات والترتيب والطلاب المتعثرين وملاحظات المدرس (`FR-EXM-01..05`).
