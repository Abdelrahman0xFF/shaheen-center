import { Layers } from 'lucide-react';
import { Badge, Card, PageHeader } from '../components/ui';

export function ModulePlaceholderPage({ title, subtitle, owner, srsRefs = [], taskFile }) {
    return (
        <div>
            <PageHeader
                title={title}
                subtitle={subtitle}
                actions={<Badge variant="info">{owner}</Badge>}
            />

            <Card>
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <Layers className="h-6 w-6" />
                    </div>
                    <div className="space-y-1.5">
                        <h2 className="text-base font-bold text-ink-900">
                            صفحة مبدئية جاهزة للتطوير
                        </h2>
                        <p className="text-sm text-ink-600">
                            ابدأ بتطوير هذه الوحدة باستخدام المكونات الجاهزة في{' '}
                            <code
                                className="rounded bg-surface-muted px-1.5 py-0.5 text-xs"
                                dir="ltr"
                            >
                                src/components/ui
                            </code>{' '}
                            وملف مهامك في{' '}
                            <code
                                className="rounded bg-surface-muted px-1.5 py-0.5 text-xs"
                                dir="ltr"
                            >
                                {taskFile}
                            </code>
                            .
                        </p>
                        {srsRefs.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {srsRefs.map((ref) => (
                                    <Badge key={ref} variant="neutral" showIcon={false}>
                                        {ref}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}
