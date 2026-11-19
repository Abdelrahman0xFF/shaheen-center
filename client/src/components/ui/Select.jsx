export function Select({
    label,
    error,
    hint,
    id,
    options = [],
    placeholder,
    className = '',
    ...props
}) {
    const selectId = id || props.name;
    return (
        <div className="space-y-1.5">
            {label && (
                <label htmlFor={selectId} className="block text-sm font-semibold text-ink-700">
                    {label}
                </label>
            )}
            <select
                id={selectId}
                className={`w-full min-h-[44px] rounded-lg border bg-surface-card px-3.5 py-2 text-sm text-ink-900 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                    error ? 'border-status-due' : 'border-surface-border'
                } ${className}`}
                {...props}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            {error ? (
                <p className="text-xs font-medium text-status-due">{error}</p>
            ) : hint ? (
                <p className="text-xs text-ink-600">{hint}</p>
            ) : null}
        </div>
    );
}
