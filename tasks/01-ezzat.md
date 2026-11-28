# مهام الفرد الأول (Member 1 — Ezzat)

**النطاق (MVP):** `Auth & RBAC` + `Branch Isolation` + `Branches & Rooms` + `Staff` + `Academic Calendar & Settings` + `Audit Log Viewer`

## الملفات الخاصة بك

- **Backend:**
    - `server/src/routes/{auth,staff,branches,settings}.routes.js`
    - `server/src/controllers/{auth,staff,branches,settings}.controller.js`
    - `server/src/services/{auth,staff,branches,settings}.service.js`
    - `server/src/middlewares/{authenticate,authorizeRoles,enforceBranchScope,rateLimiter}.js`
    - `server/src/utils/{auditLogger,encryption}.js`
- **Frontend:**
    - `client/src/context/AuthContext.jsx` & `client/src/api/client.js`
    - `client/src/layouts/MainLayout.jsx` & `client/src/components/ProtectedRoute.jsx`
    - `client/src/pages/LoginPage.jsx`
    - `client/src/pages/admin/{BranchesPage,StaffPage,SettingsPage,AuditLogsPage}.jsx`

---

## 1. تأسيس قاعدة البيانات (Day 0 — أولوية قصوى)

- [x] إنشاء وتشغيل أول Prisma Migration (`npx prisma migrate dev --name init_mvp_schema`) ورفعه على `main`.
- [x] تشغيل `npm run db:seed` والتأكد من إنشاء حساب الأدمن الافتراضي والفرع الرئيسي والإعدادات وقوالب الرسائل.

## 2. الواجهة الخلفية — MVP (Backend)

- [x] **المصادقة (`FR-AUTH-01`, `02`, `07`):**
    - [x] تنفيذ `POST /api/auth/login` بالتحقق عبر `bcryptjs` وإصدار `accessToken` + `refreshToken`.
    - [x] تطبيق قفل مؤقت للحساب (`failedLoginAttempts`, `lockedUntil`) عند تكرار الدخول الفاشل.
    - [x] تنفيذ `POST /api/auth/refresh` لتجديد التوكن وتدوير `refreshToken`.
    - [x] تنفيذ `POST /api/auth/logout` لمسح الجلسة الحالية.
    - [x] تنفيذ `POST /api/auth/logout-all` لإنهاء جميع الجلسات.
    - [x] تنفيذ `GET /api/auth/me` لبيانات المستخدم الحالي.
    - [x] وسطware `authenticate` و `authorizeRoles` و `enforceBranchScope`.
    - [x] نموذج `RefreshToken` للجلسات المتعددة والتدوير والكشف عن الإعادة.

- [ ] **إدارة الموظفين (`FR-AUTH-04`, `05`):**
    - [ ] تنفيذ `GET /api/staff` (مع البحث والفلترة والـ Pagination `FR-GEN-01`).
    - [ ] تنفيذ `POST /api/staff` لإنشاء موظف وتعيين الفروع (`UserBranch`) مع تسجيل `logAudit()`.
    - [ ] تنفيذ `PATCH /api/staff/:id` و `PATCH /api/staff/:id/status` و `POST /api/staff/:id/reset-password`.

- [x] **واجهة المصادقة الأمامية:**
    - [x] تفعيل `ProtectedRoute` في `client/src/App.jsx` وتحديث Refresh Token Interceptor في `client/src/api/client.js`.
    - [x] ربط صفحة `LoginPage.jsx` برسائل الخطأ وحالات التحميل وإظهار/إخفاء كلمة المرور.**
    - [ ] تنفيذ `GET /api/staff` (مع البحث والفلترة والـ Pagination `FR-GEN-01`).
    - [ ] تنفيذ `POST /api/staff` لإنشاء موظف وتعيين الفروع (`UserBranch`) مع تسجيل `logAudit()`.
    - [ ] تنفيذ `PATCH /api/staff/:id` و `PATCH /api/staff/:id/status` و `POST /api/staff/:id/reset-password`.
- [ ] **الفروع والقاعات (`FR-ORG-01`, `02`):**
    - [ ] تنفيذ CRUD للفروع (`GET/POST /api/branches`, `PATCH /api/branches/:id`) مع احترام `req.branchScope`.
    - [ ] تنفيذ CRUD للقاعات (`GET/POST /api/branches/:branchId/rooms`, `PATCH /api/branches/rooms/:roomId`).
- [ ] **التقويم والإعدادات وسجل المراقبة (`FR-CAL-01`, `FR-ADM-07`, `FR-RPT-02`, `03`):**
    - [ ] تنفيذ `GET/PATCH /api/settings` (حد التأخير `late_threshold_minutes`، أيام العمل، إلخ).
    - [ ] تنفيذ CRUD للفصول الدراسية (`AcademicTerm`) والإجازات الرسمية (`Holiday`).
    - [ ] تنفيذ `GET /api/settings/audit-logs` للأدمن فقط (بحث + فلترة بالكيان/المستخدم/التاريخ + Pagination).

## 3. الواجهة الأمامية — MVP (Frontend)

- [ ] تفعيل `ProtectedRoute` في `client/src/App.jsx` وتحديث Refresh Token Interceptor في `client/src/api/client.js`.
- [ ] ربط صفحة `LoginPage.jsx` برسائل الخطأ وحالات التحميل وإعادة التوجيه حسب الدور (السكرتير → `/reception`، الأدمن → `/dashboard`).
- [ ] بناء شاشة `BranchesPage.jsx` لإدارة الفروع والقاعات وسعتها.
- [ ] بناء شاشة `StaffPage.jsx` لإدارة حسابات الموظفين وتعيين فروعهم وتعطيلهم وإعادة تعيين كلمات المرور.
- [ ] بناء شاشة `SettingsPage.jsx` (التقويم الدراسي + الإجازات + إعدادات النظام).
- [ ] بناء شاشة `AuditLogsPage.jsx` لعرض سجل المراقبة للأدمن (مع عرض `before / after`).

## 4. التحقق قبل الإغلاق (Acceptance Checks)

- [ ] السكرتير أو مدير الفرع لا يستطيع قراءة بيانات فرع غير معين عليه (`FR-AUTH-04`).
- [ ] غير الأدمن يحصل على `403` عند طلب `/api/settings/audit-logs` (`FR-RPT-03`).

---

## مهام مؤجلة لما بعد الـ MVP (Post-MVP Backlog)

- [ ] تصدير واستعادة النسخ الاحتياطي لقاعدة البيانات (`FR-ADM-09`, `NFR-REL-04`).
- [ ] Service Worker كامل للتخزين المؤقت للـ PWA (`UI-02`).
- [ ] خيار تبديل اللغة إلى الإنجليزية (`UI-01`).

## Implementation status (this session)

- [x] A1 ownership authorization helpers
- [x] A2 route protection (branches/staff/settings)
- [x] A3 origin/CSRF hardening
- [x] A4 error handling + safe logging + Prisma mapping + request id + redaction
- [x] A5 frontend role route protection
- [x] A6 auth state sync + role landing
- [x] A7 lockout reset + refresh race + migration
- [x] D1 branches & rooms
- [x] D2 staff
- [x] D3 settings & calendar
- [x] D4 audit log
- [x] D5-D8 admin screens
- [x] D9 backup/restore scripts
- [x] B1 integration harness
- [x] B2 unit gaps
- [x] C1 docs/AUTHORIZATION.md
- [x] C2 env validation
- [x] C3 dependency security note
- [x] docs/AUTHENTICATION.md, SECURITY.md, BACKUP_RESTORE.md
