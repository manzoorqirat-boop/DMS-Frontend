import { Outlet } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { OrganisationDataProvider } from "@/features/organisation/OrganisationDataContext";
import { Sidebar } from "@/app-shell/Sidebar";

/**
 * Wraps every authenticated screen. Renders once ProtectedRoute has already confirmed a
 * session exists — this component can assume `user` is non-null and doesn't re-check.
 * Also where OrganisationDataProvider mounts: sites/departments/document types are only ever
 * needed once someone is signed in, so fetching them any earlier would be wasted.
 */
export function AppShell() {
  const { user, logout } = useAuth();

  if (!user) {
    // Unreachable under ProtectedRoute in normal operation; kept as a narrow type guard
    // rather than asserting, so a future routing change fails safely instead of crashing.
    return null;
  }

  return (
    <OrganisationDataProvider>
      <div className="flex h-screen overflow-hidden bg-surface">
        <Sidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-16 flex-none items-center justify-between border-b border-border bg-surface-raised px-6">
            <div />

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-text-primary">{user.fullName}</div>
                <div className="text-xs text-text-secondary">
                  {user.designation} · {user.department}
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </OrganisationDataProvider>
  );
}
