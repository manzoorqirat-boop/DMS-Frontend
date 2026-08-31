import type { ReactNode } from "react";

/**
 * The heading block every screen opens with. Extracted because it was being retyped on each
 * page with slightly different spacing each time — small drift, but it's the kind that makes
 * an app feel assembled rather than designed.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-primary">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
