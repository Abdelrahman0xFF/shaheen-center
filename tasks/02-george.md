# مهام الفرد الثاني (Member 2 — George)

**النطاق (MVP):** `Instructors` + `Courses` + `Groups` + `Schedule Conflict Detection (AC-04)` + `Auto Sessions` + `Cancel/Reschedule Session`

## الملفات الخاصة بك

- **Backend:**
    - `server/src/routes/{instructors,courses,groups,sessions}.routes.js`
    - `server/src/controllers/{instructors,courses,groups,sessions}.controller.js`
    - `server/src/services/{instructors,courses,groups,sessions}.service.js`
- **Frontend:**
    - `client/src/pages/academic/GroupsPage.jsx`
    - `client/src/pages/academic/SessionsPage.jsx`

---

## 1. الواجهة الخلفية — MVP (Backend)

- [ ] **المدرسون والمواد (`FR-ORG-03`):**
    - [ ] تنفيذ `GET/POST /api/instructors` و `PATCH /api/instructors/:id` (ربط بحساب `User` بدور `INSTRUCTOR` مع `subject`, `payType`, `payValue`).
    - [ ] تنفيذ `GET/POST /api/courses` و `PATCH /api/courses/:id` (المادة، المدرس، السنة الدراسية، المصروفات `Decimal`).
- [ ] **المجموعات وكشف التعارض (`FR-ORG-04`, `FR-ORG-05`, `AC-04`):**
    - [ ] تنفيذ دالة `detectScheduleConflict()` تتحقق من أي تداخل زمني على نفس اليوم لـ **نفس القاعة** أو **نفس المدرس**.
    - [ ] تنفيذ `GET/POST /api/groups` و `PATCH /api/groups/:id` مع رفض الحفظ برسالة واضحة (`409 CONFLICT`) عند وجود تعارض.
    - [ ] احترام `req.branchScope` (عن طريق `room.branchId`).
- [ ] **توليد الحصص وإدارة الاستثناءات (`FR-ORG-07`, `FR-ORG-08`):**
    - [ ] تنفيذ `POST /api/groups/:id/generate-sessions`: توليد حصص المجموعة لفترة محددة أو فصل دراسي مع **استبعاد أيام الإجازات (`Holiday`)** تلقائياً وتحويل المواعيد من `Africa/Cairo` إلى `UTC` في `startsAt` / `endsAt`.
    - [ ] تنفيذ `GET /api/sessions` (فلترة بالتاريخ / اليوم، الفرع، المجموعة، الحالة) و `GET /api/sessions/:id`.
    - [ ] تنفيذ `PATCH /api/sessions/:id/cancel` مع تسجيل السبب وإرسال إشعار عبر `enqueueNotification()` لأولياء أمور المجموعة (`FR-NTF-09`).
    - [ ] تنفيذ `PATCH /api/sessions/:id/reschedule` مع التحقق من عدم تعارض الموعد الجديد وإخطار أولياء الأمور.

## 2. الواجهة الأمامية — MVP (Frontend)

- [ ] بناء شاشة `GroupsPage.jsx` (بتبويبات أو أقسام: المدرسون | المواد | المجموعات) مع اختيار الفرع، القاعة، المدرس، الأيام، التوقيت، والسعة.
- [ ] عرض رسالة تنبيه واضحة للمستخدم عند رفض الحفظ بسبب تعارض قاعة أو مدرس (`FR-ORG-05`).
- [ ] زر "توليد الحصص" لكل مجموعة مع اختيار نطاق التاريخ أو الفصل الدراسي.
- [ ] بناء شاشة `SessionsPage.jsx` لعرض جدول حصص اليوم/الأسبوع مع أزرار: **إلغاء حصة** و **تعديل موعد حصة**.

## 3. التحقق قبل الإغلاق (Acceptance Checks)

- [ ] **`AC-04`:** إنشاء مجموعتين في نفس القاعة أو لنفس المدرس في وقت متداخل يتم منعه برسالة تعارض واضحة.
- [ ] توليد الحصص يتجاهل التواريخ المسجلة في جدول `Holiday`.

---

## مهام مؤجلة لما بعد الـ MVP (Post-MVP Backlog)

- [ ] واجهة المدرس ولوحة معلوماته (`UI-07`, `FR-INS-01`, `FR-INS-09`).
- [ ] طلبات الإجازة وتغيير المواعيد وموافقة الأدمن (`FR-INS-07`).
- [ ] إعلانات المدرس لمجموعاته (`FR-INS-08`) والملازم (`FR-PRT-04`).
