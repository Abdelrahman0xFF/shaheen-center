import { Navigate, Route, Routes } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute, RoleProtectedRoute } from './components/ProtectedRoute';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { StudentHomePage } from './pages/StudentHomePage';

// Member 1 (Ezzat)
import { BranchesPage } from './pages/admin/BranchesPage';
import { StaffPage } from './pages/admin/StaffPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';

// Member 2 (George)
import { GroupsPage } from './pages/academic/GroupsPage';
import { SessionsPage } from './pages/academic/SessionsPage';

// Member 3 (Marco)
import { StudentsPage } from './pages/students/StudentsPage';
import { StudentProfilePage } from './pages/students/StudentProfilePage';

// Member 4 (Mazen)
import { ReceptionPage } from './pages/attendance/ReceptionPage';
import { AttendanceSheetsPage } from './pages/attendance/AttendanceSheetsPage';

// Member 5 (3ATEF)
import { DashboardPage } from './pages/finance/DashboardPage';
import { PaymentsPage } from './pages/finance/PaymentsPage';
import { DailyClosingPage } from './pages/finance/DailyClosingPage';
import { MessagesPage } from './pages/finance/MessagesPage';

const ADMIN = ['ADMIN'];
const ADMIN_MANAGER = ['ADMIN', 'BRANCH_MANAGER'];
const RECEPTION = ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY'];
const SESSIONS = ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY', 'INSTRUCTOR'];
const STUDENTS = ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY', 'INSTRUCTOR'];

/**
 * Application routes. Authenticated routes require ProtectedRoute; role-gated
 * routes require RoleProtectedRoute with an explicit role set (A5).
 */
export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />

                    {/* Member 5 (3ATEF) */}
                    <Route element={<RoleProtectedRoute allowedRoles={ADMIN_MANAGER} />}>
                        <Route path="/dashboard" element={<DashboardPage />} />
                    </Route>
                    <Route element={<RoleProtectedRoute allowedRoles={RECEPTION} />}>
                        <Route path="/payments" element={<PaymentsPage />} />
                        <Route path="/daily-closing" element={<DailyClosingPage />} />
                        <Route path="/messages" element={<MessagesPage />} />
                    </Route>

                    {/* Member 4 (Mazen) */}
                    <Route element={<RoleProtectedRoute allowedRoles={RECEPTION} />}>
                        <Route path="/reception" element={<ReceptionPage />} />
                    </Route>
                    <Route element={<RoleProtectedRoute allowedRoles={SESSIONS} />}>
                        <Route path="/attendance" element={<AttendanceSheetsPage />} />
                    </Route>

                    {/* Member 3 (Marco) */}
                    <Route element={<RoleProtectedRoute allowedRoles={STUDENTS} />}>
                        <Route path="/students" element={<StudentsPage />} />
                        <Route path="/students/:id" element={<StudentProfilePage />} />
                    </Route>

                    {/* Member 2 (George) */}
                    <Route element={<RoleProtectedRoute allowedRoles={ADMIN_MANAGER} />}>
                        <Route path="/groups" element={<GroupsPage />} />
                    </Route>
                    <Route element={<RoleProtectedRoute allowedRoles={SESSIONS} />}>
                        <Route path="/sessions" element={<SessionsPage />} />
                    </Route>

                    {/* Member 1 (Ezzat) */}
                    <Route element={<RoleProtectedRoute allowedRoles={ADMIN_MANAGER} />}>
                        <Route path="/branches" element={<BranchesPage />} />
                    </Route>
                    <Route element={<RoleProtectedRoute allowedRoles={ADMIN} />}>
                        <Route path="/staff" element={<StaffPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/audit-logs" element={<AuditLogsPage />} />
                    </Route>

                    {/* Student */}
                    <Route element={<RoleProtectedRoute allowedRoles={['STUDENT']} />}>
                        <Route path="/my" element={<StudentHomePage />} />
                    </Route>
                </Route>
            </Route>

            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}
