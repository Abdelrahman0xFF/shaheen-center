# مهام الفرد الثالث (Member 3 — Marco)

**النطاق (MVP):** `Students (AES-256 + Blind Index + Soft Delete)` + `Parent Siblings Model` + `QR Cards` + `Enrollments & Transfers` + `Student Profile`

## الملفات الخاصة بك

- **Backend:**
    - `server/src/routes/{students,enrollments}.routes.js`
    - `server/src/controllers/{students,enrollments}.controller.js`
    - `server/src/services/{students,enrollments}.service.js`
- **Frontend:**
    - `client/src/pages/students/StudentsPage.jsx`
    - `client/src/pages/students/StudentProfilePage.jsx`
    - (مكونات مقترحة داخل `client/src/pages/students/components/`: `StudentFormModal.jsx`, `QrCardPrint.jsx`, `EnrollModal.jsx`)

---

## 1. الواجهة الخلفية — MVP (Backend)

- [ ] **إدارة الطلاب والتشفير (`FR-STU-01..10`, `AC-06`):**
    - [ ] تنفيذ `POST /api/students`:
        - التحقق من صيغة رقم الموبايل المصري (`isValidEgyptianPhone`) وكشف التكرار (`FR-STU-10`).
        - ربط/إنشاء سجل `Parent` برقم `parentPhone` لدعم تعدد الأبناء (`FR-STU-06`).
        - تشفير الرقم القومي بـ `encryptSensitive()` وحفظ `nationalIdHash` بـ `createBlindIndex()` (`FR-STU-05`).
        - توليد `qrToken` عشوائي بـ `generateQrToken()` (`FR-STU-02`).
    - [ ] تنفيذ `GET /api/students`: البحث بالاسم أو الهاتف (والبحث بالرقم القومي للأدمن فقط عبر `nationalIdHash`) + فلترة بالفرع/السنة الدراسية + Pagination + استبعاد المحذوف ناعماً (`deletedAt: null`).
    - [ ] تنفيذ `GET /api/students/:id`: إرجاع بيانات الطالب + اشتراكاته + آخر حضوره ومدفوعاته ورسائله؛ **فك تشفير الرقم القومي للأدمن حصرياً وحجبه تماماً عن باقي الأدوار (`AC-06`)**.
    - [ ] تنفيذ `PATCH /api/students/:id` و `DELETE /api/students/:id` (حذف ناعم عبر `deletedAt` فقط مع `logAudit()` — ممنوع الحذف النهائي `FR-STU-08`).
    - [ ] تنفيذ `POST /api/students/:id/regenerate-qr`: توليد كود جديد وإبطال القديم مع تسجيل `logAudit()` (`FR-STU-04`).
    - [ ] تنفيذ `GET /api/students/:id/qr-card` لبيانات طباعة الكارت.
- [ ] **التسكين والنقل (`FR-ENR-01..03`, `FR-ORG-06`):**
    - [ ] تنفيذ `POST /api/enrollments`: تسكين طالب في مجموعة مع التحقق من عدم تجاوز `min(group.capacity, room.capacity)` إلا بتجاوز من `ADMIN` مع `capacityOverrideReason` وتسجيل `logAudit()`.
    - [ ] تنفيذ `GET /api/enrollments` و `PATCH /api/enrollments/:id/status` (`ACTIVE` / `PAUSED` / `ENDED`).
    - [ ] تنفيذ `POST /api/enrollments/:id/transfer`: نقل الطالب لمجموعة أخرى داخل `prisma.$transaction()` مع الحفاظ الكامل على سجل الحضور والمدفوعات (`FR-ENR-02`).

## 2. الواجهة الأمامية — MVP (Frontend)

- [ ] بناء شاشة `StudentsPage.jsx` (بحث، فلترة، Pagination، زر تسجيل طالب جديد، أزرار فتح الملف / طباعة الكارت).
- [ ] بناء فورم تسجيل وتعديل الطالب (مع التحقق الفوري من رقم الموبايل المصري والرقم القومي).
- [ ] تصميم مكون **كارت الطالب القابل للطباعة (`QrCardPrint`)** باستخدام كلاس `.print-qr-card` (الصورة، الاسم، الفرع، الـ QR Code، زر طباعة `window.print()`). _(يمكن تثبيت `qrcode.react` في `client/`)_.
- [ ] بناء صفحة `StudentProfilePage.jsx` (`UI-06`) بالتبويبات المتاحة في الـ MVP: **البيانات** (إخفاء الرقم القومي لغير الأدمن) | **الكورسات والتسكين** (تسكين/نقل) | **الحضور** | **المدفوعات** | **الرسائل** + زر تجديد الـ QR.

## 3. التحقق قبل الإغلاق (Acceptance Checks)

- [ ] **`AC-06`:** عند طلب بيانات طالب بحساب `SECRETARY` أو `BRANCH_MANAGER`، لا يظهر الرقم القومي ولا يُسمح بالبحث به.
- [ ] حذف طالب يضبط `deletedAt` فقط ولا يحذف سجلاته من قاعدة البيانات.

---

## مهام مؤجلة لما بعد الـ MVP (Post-MVP Backlog)

- [ ] بوابة الطالب (`FR-PRT-01`).
- [ ] بوابة ولي الأمر عبر `MagicLink` (`FR-AUTH-06`, `FR-PRT-02`, `FR-PRT-03`).
- [ ] تبويب الدرجات بعد إنهاء موديول الامتحانات (`FR-EXM-*`).
