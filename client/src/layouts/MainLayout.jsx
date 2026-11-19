import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Building2,
    Users,
    BookOpen,
    CalendarDays,
    GraduationCap,
    ScanLine,
    ClipboardCheck,
    Wallet,
    Calculator,
    MessageSquare,
    Settings,
    ShieldCheck,
    LogOut,
    Menu,
    X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS_AR } from '../utils/formatters';

/**
 * Role-based right-hand RTL Sidebar navigation (SRS UI-03).
 * Owned by Member 1 (Ezzat); links point to all 5 members' MVP routes.
 */
const NAV_ITEMS = [
    {
        to: '/dashboard',
        label: 'لوحة التحكم',
        icon: LayoutDashboard,
        roles: ['ADMIN', 'BRANCH_MANAGER'],
    },
    {
        to: '/reception',
        label: 'شاشة الاستقبال (QR)',
        icon: ScanLine,
        roles: ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY'],
    },
    {
        to: '/students',
        label: 'الطلاب والتسكين',
        icon: GraduationCap,
        roles: ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY'],
    },
    {
        to: '/attendance',
        label: 'كشوف الحضور والغياب',
        icon: ClipboardCheck,
        roles: ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY', 'INSTRUCTOR'],
    },
    {
        to: '/payments',
        label: 'المدفوعات والاشتراكات',
        icon: Wallet,
        roles: ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY'],
    },
    {
        to: '/daily-closing',
        label: 'تقفيل اليومية',
        icon: Calculator,
        roles: ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY'],
    },
    {
        to: '/groups',
        label: 'المواد والمجموعات',
        icon: BookOpen,
        roles: ['ADMIN', 'BRANCH_MANAGER'],
    },
    {
        to: '/sessions',
        label: 'الحصص والجدول',
        icon: CalendarDays,
        roles: ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY', 'INSTRUCTOR'],
    },
    {
        to: '/branches',
        label: 'الفروع والقاعات',
        icon: Building2,
        roles: ['ADMIN', 'BRANCH_MANAGER'],
    },
    {
        to: '/staff',
        label: 'الموظفون والصلاحيات',
        icon: Users,
        roles: ['ADMIN'],
    },
    {
        to: '/messages',
        label: 'سجل الرسائل (Zagel)',
        icon: MessageSquare,
        roles: ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY'],
    },
    {
        to: '/audit-logs',
        label: 'سجل المراقبة',
        icon: ShieldCheck,
        roles: ['ADMIN'],
    },
    {
        to: '/settings',
        label: 'التقويم والإعدادات',
        icon: Settings,
        roles: ['ADMIN'],
    },
];

export function MainLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const visibleItems = user
        ? NAV_ITEMS.filter((item) => item.roles.includes(user.role))
        : NAV_ITEMS;

    async function handleLogout() {
        await logout();
        navigate('/login');
    }

    const sidebarContent = (
        <div className="flex h-full flex-col bg-surface-card">
            {/* Brand header */}
            <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 font-extrabold text-white shadow-xs">
                        ش
                    </div>
                    <div>
                        <p className="text-base font-extrabold text-ink-900 leading-tight">
                            سنتر شاهين
                        </p>
                        <p className="text-xs text-ink-600">نظام الإدارة — MVP</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="rounded-lg p-1.5 text-ink-600 hover:bg-surface-muted lg:hidden cursor-pointer"
                    aria-label="إغلاق القائمة"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                {visibleItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        onClick={() => setDrawerOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition ${
                                isActive
                                    ? 'bg-brand-50 text-brand-700'
                                    : 'text-ink-700 hover:bg-surface-muted hover:text-ink-900'
                            }`
                        }
                    >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Footer / User summary */}
            <div className="border-t border-surface-border p-3">
                <div className="mb-2 rounded-lg bg-surface-bg px-3 py-2">
                    <p className="truncate text-sm font-bold text-ink-900">
                        {user?.name || 'وضع المعاينة'}
                    </p>
                    <p className="text-xs text-ink-600">
                        {ROLE_LABELS_AR[user?.role] || 'مدير النظام'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-sm font-semibold text-status-due hover:bg-status-due-bg transition cursor-pointer"
                >
                    <LogOut className="h-4 w-4" />
                    <span>تسجيل الخروج</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-surface-bg">
            {/* Desktop Right-Hand RTL Sidebar */}
            <aside className="no-print hidden w-68 shrink-0 border-e border-surface-border lg:block">
                <div className="sticky top-0 h-screen">{sidebarContent}</div>
            </aside>

            {/* Mobile Drawer */}
            {drawerOpen && (
                <div className="no-print fixed inset-0 z-50 flex lg:hidden">
                    <div className="w-72 max-w-[85vw] shadow-xl">{sidebarContent}</div>
                    <button
                        type="button"
                        className="flex-1 bg-ink-900/40"
                        onClick={() => setDrawerOpen(false)}
                        aria-label="إغلاق"
                    />
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex min-w-0 flex-1 flex-col">
                <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between border-b border-surface-border bg-surface-card/90 px-4 backdrop-blur-xs lg:px-6">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setDrawerOpen(true)}
                            className="rounded-lg p-2 text-ink-700 hover:bg-surface-muted lg:hidden cursor-pointer"
                            aria-label="فتح القائمة"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <span className="text-sm font-semibold text-ink-600">
                            {new Intl.DateTimeFormat('ar-EG', {
                                timeZone: 'Africa/Cairo',
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                            }).format(new Date())}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                            توقيت القاهرة
                        </span>
                    </div>
                </header>

                <main className="flex-1 p-4 lg:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
