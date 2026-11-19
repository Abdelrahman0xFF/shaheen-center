import { CheckCircle2, AlertCircle, Clock, Info } from 'lucide-react';

/**
 * Accessible status badge pairing color + icon + Arabic text (NFR-USE-02, FR-REC-02).
 */
const VARIANTS = {
    paid: {
        classes: 'bg-status-paid-bg text-status-paid-text border-status-paid/20',
        Icon: CheckCircle2,
    },
    due: {
        classes: 'bg-status-due-bg text-status-due-text border-status-due/20',
        Icon: AlertCircle,
    },
    late: {
        classes: 'bg-status-late-bg text-status-late-text border-status-late/20',
        Icon: Clock,
    },
    info: {
        classes: 'bg-status-info-bg text-status-info-text border-status-info/20',
        Icon: Info,
    },
    neutral: {
        classes: 'bg-surface-muted text-ink-700 border-surface-border',
        Icon: null,
    },
};

export function Badge({ children, variant = 'neutral', showIcon = true, className = '' }) {
    const { classes, Icon } = VARIANTS[variant] || VARIANTS.neutral;
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${classes} ${className}`}
        >
            {showIcon && Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
            <span>{children}</span>
        </span>
    );
}
