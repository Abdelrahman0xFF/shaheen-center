export function Table({
    columns = [],
    rows = [],
    emptyMessage = 'لا توجد بيانات لعرضها',
    keyField = 'id',
}) {
    return (
        <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface-card">
            <table className="w-full border-collapse text-start text-sm">
                <thead className="border-b border-surface-border bg-surface-bg text-xs font-bold text-ink-600">
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={`px-4 py-3 text-start whitespace-nowrap ${col.className || ''}`}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                    {rows.length === 0 ? (
                        <tr>
                            <td
                                colSpan={Math.max(1, columns.length)}
                                className="px-4 py-10 text-center text-ink-600"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        rows.map((row, idx) => (
                            <tr
                                key={row[keyField] ?? idx}
                                className="hover:bg-surface-bg/60 transition"
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        className={`px-4 py-3 text-ink-900 ${col.cellClassName || ''}`}
                                    >
                                        {col.render ? col.render(row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
