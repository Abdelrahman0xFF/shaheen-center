export function PageHeader({ title, subtitle, actions }) {
    return (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-ink-900">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-ink-600">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

export function EmptyState({ icon: Icon, title, description, action }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-surface-border bg-surface-card px-6 py-12 text-center">
            {Icon && (
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Icon className="h-6 w-6" />
                </div>
            )}
            <h3 className="text-base font-bold text-ink-900">{title}</h3>
            {description && <p className="mt-1 max-w-md text-sm text-ink-600">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
