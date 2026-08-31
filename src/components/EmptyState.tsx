import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

/**
 * An empty result set is a moment for direction, not mood — it should say what's true and
 * what to do about it, in the interface's own voice. "No documents match your search" plus a
 * way to clear the search is useful; a friendly illustration and "Nothing here!" is not.
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-text-tertiary/10">
        <Icon className="h-6 w-6 text-text-tertiary" aria-hidden="true" />
      </div>
      <h3 className="font-display text-base font-semibold text-text-primary">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-text-secondary">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
