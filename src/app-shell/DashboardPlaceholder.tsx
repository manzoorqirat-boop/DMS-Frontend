import { StatusBadge } from "@/components/StatusBadge";
import { LIFECYCLE_STAGES } from "@/lib/lifecycle";
import { useAuth } from "@/features/auth/useAuth";

/**
 * The screen after sign-in. Deliberately minimal — its job right now is to prove the auth
 * flow completes end to end, not to be the real dashboard. The status-chip preview doubles
 * as a visible check that the same color system introduced on the login screen survives the
 * trip into the authenticated app unchanged.
 */
export function DashboardPlaceholder() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-semibold text-text-primary">
        Welcome, {user?.fullName}
      </h1>
      <p className="mt-1.5 text-sm text-text-secondary">
        Signed in as <span className="font-mono">{user?.userName}</span> · {user?.designation}
      </p>

      <div className="mt-8 rounded-xl border border-border bg-surface-raised p-6">
        <h2 className="font-display text-sm font-semibold text-text-primary">
          The lifecycle system carries through
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          The same six colors from the sign-in screen are what every document's status will
          look like once the register is built.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {LIFECYCLE_STAGES.map((stage) => (
            <StatusBadge key={stage.key} status={stage.key} />
          ))}
        </div>
      </div>

      <p className="mt-6 text-sm text-text-tertiary">
        This is a placeholder landing screen. The document register, admin screens, and
        everything else described in the backend are still to be built here.
      </p>
    </div>
  );
}
