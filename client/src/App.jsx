import { Navigate, Route, Routes } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';

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

/**
 * NOTE: Once Member 1 finishes /api/auth/login, wrap the MainLayout <Route>
 * inside <Route element={<ProtectedRoute />}> (already built in components/ProtectedRoute.jsx).
 */
export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<MainLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Member 5 (3ATEF) */}
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/daily-closing" element={<DailyClosingPage />} />
                <Route path="/messages" element={<MessagesPage />} />

                {/* Member 4 (Mazen) */}
                <Route path="/reception" element={<ReceptionPage />} />
                <Route path="/attendance" element={<AttendanceSheetsPage />} />

                {/* Member 3 (Marco) */}
                <Route path="/students" element={<StudentsPage />} />
                <Route path="/students/:id" element={<StudentProfilePage />} />

                {/* Member 2 (George) */}
                <Route path="/groups" element={<GroupsPage />} />
                <Route path="/sessions" element={<SessionsPage />} />

                {/* Member 1 (Ezzat) */}
                <Route path="/branches" element={<BranchesPage />} />
                <Route path="/staff" element={<StaffPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/audit-logs" element={<AuditLogsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}
