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

- [ ] إنشاء وتشغيل أول Prisma Migration (`npx prisma migrate dev --name init_mvp_schema`) ورفعه على `main`.
- [ ] تشغيل `npm run db:seed` والتأكد من إنشاء حساب الأدمن الافتراضي والفرع الرئيسي والإعدادات وقوالب الرسائل.

## 2. الواجهة الخلفية — MVP (Backend)

- [ ] **المصادقة (`FR-AUTH-01`, `02`, `07`):**
    - [ ] تنفيذ `POST /api/auth/login` بالتحقق عبر `bcryptjs` وإصدار `accessToken` + `refreshToken`.
    - [ ] تطبيق قفل مؤقت للحساب (`failedLoginAttempts`, `lockedUntil`) عند تكرار الدخول الفاشل.
    - [ ] تنفيذ `POST /api/auth/refresh` لتجديد التوكن وتدوير `refreshTokenHash`.
    - [ ] تنفيذ `POST /api/auth/logout` لمسح `refreshTokenHash`.
- [ ] **إدارة الموظفين (`FR-AUTH-04`, `05`):**
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
