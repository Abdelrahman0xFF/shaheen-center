export const ROLES = ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY', 'INSTRUCTOR', 'STUDENT'];

// Role landing pages after login / when a role has no explicit deep link.
export const ROLE_LANDING = {
    ADMIN: '/dashboard',
    BRANCH_MANAGER: '/dashboard',
    SECRETARY: '/reception',
    INSTRUCTOR: '/sessions',
    STUDENT: '/my',
};

export function roleLanding(role) {
    return ROLE_LANDING[role] || '/dashboard';
}

/**
 * Route protection matrix. `roles` is the allowed-role list; `null` means any
 * authenticated user. Single source of truth for both routing and nav.
 */
export const ROUTE_ACCESS = [
    { path: '/dashboard', roles: ['ADMIN', 'BRANCH_MANAGER'] },
    { path: '/reception', roles: ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY'] },
    { path: '/attendance', roles: ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY', 'INSTRUCTOR'] },
    { path: '/payments', roles: ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY'] },
    { path: '/daily-closing', roles: ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY'] },
    { path: '/messages', roles: ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY'] },
    { path: '/students', roles: ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY', 'INSTRUCTOR'] },
    { path: '/students/:id', roles: ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY', 'INSTRUCTOR'] },
    { path: '/groups', roles: ['ADMIN', 'BRANCH_MANAGER'] },
    { path: '/sessions', roles: ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY', 'INSTRUCTOR'] },
    { path: '/branches', roles: ['ADMIN', 'BRANCH_MANAGER'] },
    { path: '/staff', roles: ['ADMIN'] },
    { path: '/settings', roles: ['ADMIN'] },
    { path: '/audit-logs', roles: ['ADMIN'] },
    { path: '/my', roles: ['STUDENT'] },
];

export function rolesForPath(path) {
    const entry = ROUTE_ACCESS.find((r) => r.path === path);
    return entry ? entry.roles : null;
}

export function canAccessPath(role, path) {
    const roles = rolesForPath(path);
    if (roles === null) return true;
    return roles.includes(role);
}
