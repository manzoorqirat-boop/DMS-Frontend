import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Loader2, Plus, Users2 } from "lucide-react";
import { createUser, deactivateUser, listUsers, reactivateUser } from "@/api/users";
import { ApiError } from "@/lib/api-client";
import { formatDateOnly } from "@/lib/format";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import type { UserSummary } from "@/types/users";

const inputClasses =
  "w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[9px] text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand-tint";

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-2.5 rounded-[9px] border border-danger/25 bg-danger-tint px-3.5 py-2.5 text-[13px] leading-snug text-[#9c332f]"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

const emptyForm = { userName: "", fullName: "", department: "", designation: "", password: "", employeeId: "" };

export function UsersAdminPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function refresh() {
    setIsLoading(true);
    setError(null);
    listUsers(true)
      .then(setUsers)
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Could not load users.");
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(refresh, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!form.userName.trim() || !form.fullName.trim() || !form.department.trim() || !form.designation.trim() || !form.password) {
      setError("All fields are required.");
      return;
    }

    setIsCreating(true);
    try {
      await createUser({
        userName: form.userName.trim(),
        fullName: form.fullName.trim(),
        department: form.department.trim(),
        designation: form.designation.trim(),
        password: form.password,
        // Optional: §11.100(b) asks that an individual's identity be verified before their
        // e-signature is issued, and a payroll-backed identifier is what ties the account to a
        // verified person rather than to a login someone created.
        employeeId: form.employeeId.trim() || null,
      });
      setForm(emptyForm);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the user.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleActive(user: UserSummary) {
    setError(null);
    setPendingId(user.id);
    try {
      if (user.isActive) {
        await deactivateUser(user.id);
      } else {
        await reactivateUser(user.id);
      }
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the user.");
    } finally {
      setPendingId(null);
    }
  }

  const columns: DataTableColumn<UserSummary>[] = [
    { key: "userName", header: "Username", className: "font-mono", render: (u) => u.userName },
    { key: "fullName", header: "Full name", render: (u) => u.fullName },
    { key: "department", header: "Department", render: (u) => u.department },
    { key: "designation", header: "Designation", render: (u) => u.designation },
    {
      key: "employeeId",
      header: "Employee ID",
      className: "font-mono text-xs",
      render: (u) => u.employeeId ?? <span className="text-text-tertiary">—</span>,
    },
    {
      key: "passwordState",
      header: "Password",
      render: (u) =>
        u.mustChangePassword ? (
          // Worth showing: an account in this state has a password its administrator knows,
          // and since the password is also the signing credential, it cannot sign anything
          // until the holder has replaced it.
          <span className="inline-flex items-center rounded-full bg-stage-review/10 px-2.5 py-0.5 text-xs font-medium text-stage-review">
            Change required
          </span>
        ) : (
          <span className="font-mono text-xs text-text-secondary">
            set {formatDateOnly(u.passwordLastChanged.slice(0, 10))}
          </span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              u.isActive ? "bg-brand-tint text-brand" : "bg-text-tertiary/10 text-text-tertiary"
            }`}
          >
            {u.isActive ? "Active" : "Inactive"}
          </span>
          {u.isLockedOut && (
            <span className="inline-flex items-center rounded-full bg-danger-tint px-2.5 py-0.5 text-xs font-medium text-[#9c332f]">
              Locked
            </span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (u) => (
        <button
          type="button"
          disabled={pendingId === u.id}
          onClick={() => handleToggleActive(u)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text-primary disabled:opacity-60"
        >
          {u.isActive ? "Deactivate" : "Reactivate"}
        </button>
      ),
    },
  ];

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1.5 font-display text-2xl font-semibold text-text-primary">Users</h1>
      <p className="mb-6 text-sm text-text-secondary">
        General login accounts. A new user isn't a signatory anywhere until assigned a role
        with the right permission — see Roles.
      </p>

      {error && <ErrorBanner message={error} />}

      <form onSubmit={handleCreate} className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface-raised p-4 sm:grid-cols-5">
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="userName" className="mb-[6px] block text-xs font-semibold text-text-primary">Username</label>
          <input id="userName" value={form.userName} onChange={(e) => setForm((f) => ({ ...f, userName: e.target.value }))} placeholder="a.nair" className={inputClasses} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="fullName" className="mb-[6px] block text-xs font-semibold text-text-primary">Full name</label>
          <input id="fullName" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Anjali Nair" className={inputClasses} />
        </div>
        <div>
          <label htmlFor="department" className="mb-[6px] block text-xs font-semibold text-text-primary">Department</label>
          <input id="department" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} placeholder="Quality" className={inputClasses} />
        </div>
        <div>
          <label htmlFor="designation" className="mb-[6px] block text-xs font-semibold text-text-primary">Designation</label>
          <input id="designation" value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} placeholder="QA Officer" className={inputClasses} />
        </div>
        <div>
          <label htmlFor="employeeId" className="mb-[6px] block text-xs font-semibold text-text-primary">Employee ID (optional)</label>
          <input id="employeeId" value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} placeholder="EMP-10421" className={`font-mono ${inputClasses}`} />
        </div>
        <div>
          <label htmlFor="password" className="mb-[6px] block text-xs font-semibold text-text-primary">Initial password</label>
          <input id="password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Temporary" className={inputClasses} />
        </div>
        <div className="col-span-2 flex items-end sm:col-span-5">
          <button
            type="submit"
            disabled={isCreating}
            className="flex items-center gap-1.5 rounded-[9px] bg-brand px-3.5 py-[9px] text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            Add user
          </button>
        </div>
      </form>

      <DataTable
        columns={columns}
        rows={users}
        getRowKey={(u) => u.id}
        isLoading={isLoading}
        skeletonRowCount={4}
        emptyState={<EmptyState icon={Users2} title="No users yet" description="Add one above." />}
      />
    </div>
  );
}
