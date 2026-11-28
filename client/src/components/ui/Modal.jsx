import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Shared accessible modal. Unmounts when closed and releases body scroll lock.
 * Rendered inside the page; notifications must live outside this component.
 */
export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
    useEffect(() => {
        if (!open) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow || '';
        };
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div
                className={`w-full ${maxWidth} rounded-2xl border border-surface-border bg-surface-card shadow-xl`}
            >
                <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
                    <h2 className="text-lg font-bold text-ink-900">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-ink-600 hover:bg-surface-muted hover:text-ink-900 cursor-pointer"
                        aria-label="إغلاق"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}
