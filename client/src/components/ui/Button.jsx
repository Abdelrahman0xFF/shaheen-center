export function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    type = 'button',
    ...props
}) {
    const variants = {
        primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500',
        secondary:
            'bg-surface-card text-ink-900 border border-surface-border hover:bg-surface-muted focus-visible:ring-brand-500',
        accent: 'bg-accent-500 text-white hover:bg-accent-600 focus-visible:ring-accent-500',
        danger: 'bg-status-due text-white hover:opacity-90 focus-visible:ring-status-due',
        ghost: 'bg-transparent text-ink-700 hover:bg-surface-muted focus-visible:ring-brand-500',
    };

    const sizes = {
        sm: 'min-h-[36px] px-3 py-1.5 text-xs',
        md: 'min-h-[44px] px-4 py-2.5 text-sm',
        lg: 'min-h-[48px] px-5 py-3 text-base',
    };

    return (
        <button
            type={type}
            className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
