export function Card({ children, className = '', padding = 'p-5' }) {
    return (
        <div
            className={`rounded-xl border border-surface-border bg-surface-card shadow-xs ${padding} ${className}`}
        >
            {children}
        </div>
    );
}
