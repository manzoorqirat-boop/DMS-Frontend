import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Loader2, Plus, ShieldCheck } from "lucide-react";
import {
  assignRole,
  createRole,
  listAllPermissions,
  listRoleAssignments,
  listRoles,
  revokeRoleAssignment,
  setRolePermissions,
} from "@/api/roles";
import { listUsers } from "@/api/users";
import { ApiError } from "@/lib/api-client";
import { useOrganisationData } from "@/features/organisation/useOrganisationData";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import type { AssignmentView, Permission, RoleView } from "@/types/access";
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

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RolesAdminPage() {
  const { sites, departments, getSiteName, getDepartmentName } = useOrganisationData();

  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);

  const [roles, setRoles] = useState<RoleView[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [roleError, setRoleError] = useState<string | null>(null);

  const [newRoleCode, setNewRoleCode] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<Set<Permission>>(new Set());
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [assignments, setAssignments] = useState<AssignmentView[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const [assignUserId, setAssignUserId] = useState("");
  const [assignRoleId, setAssignRoleId] = useState("");
  const [assignSiteId, setAssignSiteId] = useState("");
  const [assignDepartmentId, setAssignDepartmentId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);

  function refreshRoles() {
    setIsLoadingRoles(true);
    setRoleError(null);
    listRoles(true)
      .then(setRoles)
      .catch((err: unknown) => setRoleError(err instanceof ApiError ? err.message : "Could not load roles."))
      .finally(() => setIsLoadingRoles(false));
  }

  function refreshAssignments() {
    setIsLoadingAssignments(true);
    setAssignmentError(null);
    listRoleAssignments()
      .then(setAssignments)
      .catch((err: unknown) =>
        setAssignmentError(err instanceof ApiError ? err.message : "Could not load assignments."),
      )
      .finally(() => setIsLoadingAssignments(false));
  }

  useEffect(() => {
    refreshRoles();
    refreshAssignments();
    listAllPermissions()
      .then((result) => setAllPermissions(result.map((p) => p.name)))
      .catch(() => undefined);
    listUsers(false).then(setUsers).catch(() => undefined);
  }, []);

  const activeRoles = roles.filter((r) => r.isActive);
  const departmentsForAssignSite = useMemo(
    () => departments.filter((d) => d.siteId === assignSiteId),
    [departments, assignSiteId],
  );

  async function handleCreateRole(event: FormEvent) {
    event.preventDefault();
    setRoleError(null);

    if (!newRoleCode.trim() || !newRoleName.trim()) {
      setRoleError("Code and name are required.");
      return;
    }

    setIsCreatingRole(true);
    try {
      await createRole({
        code: newRoleCode.trim(),
        name: newRoleName.trim(),
        description: newRoleDescription.trim() || null,
        permissions: [],
      });
      setNewRoleCode("");
      setNewRoleName("");
      setNewRoleDescription("");
      refreshRoles();
    } catch (err) {
      setRoleError(err instanceof ApiError ? err.message : "Could not create the role.");
    } finally {
      setIsCreatingRole(false);
    }
  }

  function startEditingPermissions(role: RoleView) {
    setRoleError(null);
    setEditingRoleId(role.id);
    setEditingPermissions(new Set(role.permissions));
  }

  function togglePermission(permission: Permission) {
    setEditingPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) {
        next.delete(permission);
      } else {
        next.add(permission);
      }
      return next;
    });
  }

  async function handleSavePermissions() {
    if (!editingRoleId) return;
    setRoleError(null);
    setIsSavingPermissions(true);
    try {
      await setRolePermissions(editingRoleId, Array.from(editingPermissions));
      setEditingRoleId(null);
      refreshRoles();
    } catch (err) {
      setRoleError(err instanceof ApiError ? err.message : "Could not save permissions.");
    } finally {
      setIsSavingPermissions(false);
    }
  }

  async function handleAssign(event: FormEvent) {
    event.preventDefault();
    setAssignmentError(null);

    if (!assignUserId || !assignRoleId) {
      setAssignmentError("Choose a user and a role.");
      return;
    }

    setIsAssigning(true);
    try {
      await assignRole({
        userId: assignUserId,
        roleId: assignRoleId,
        siteId: assignSiteId || null,
        departmentId: assignDepartmentId || null,
      });
      setAssignUserId("");
      setAssignRoleId("");
      setAssignSiteId("");
      setAssignDepartmentId("");
      refreshAssignments();
    } catch (err) {
      setAssignmentError(err instanceof ApiError ? err.message : "Could not create the assignment.");
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleRevoke(assignment: AssignmentView) {
    setAssignmentError(null);
    setPendingRevokeId(assignment.id);
    try {
      await revokeRoleAssignment(assignment.id);
      refreshAssignments();
    } catch (err) {
      setAssignmentError(err instanceof ApiError ? err.message : "Could not revoke the assignment.");
    } finally {
      setPendingRevokeId(null);
    }
  }

  function describeScope(a: AssignmentView): string {
    if (a.scope === "Global") return "Global";
    if (a.scope === "Site") return a.siteId ? getSiteName(a.siteId) : "Site";
    return a.siteId && a.departmentId
      ? `${getSiteName(a.siteId)} / ${getDepartmentName(a.departmentId)}`
      : "Department";
  }

  const roleColumns: DataTableColumn<RoleView>[] = [
    { key: "code", header: "Code", className: "font-mono", render: (r) => r.code },
    {
      key: "name",
      header: "Name",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          {r.name}
          {r.isSystem && (
            <span className="rounded-full bg-text-tertiary/10 px-2 py-0.5 text-[10px] font-medium text-text-tertiary">
              System
            </span>
          )}
        </span>
      ),
    },
    {
      key: "permissions",
      header: "Permissions",
      render: (r) => (
        <span className="text-text-secondary">
          {r.permissions.length} of {allPermissions.length || 20}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            r.isActive ? "bg-brand-tint text-brand" : "bg-text-tertiary/10 text-text-tertiary"
          }`}
        >
          {r.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <button
          type="button"
          onClick={() => startEditingPermissions(r)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
        >
          Edit permissions
        </button>
      ),
    },
  ];

  const assignmentColumns: DataTableColumn<AssignmentView>[] = [
    { key: "userName", header: "User", className: "font-mono", render: (a) => a.userName },
    { key: "roleCode", header: "Role", className: "font-mono", render: (a) => a.roleCode },
    { key: "scope", header: "Scope", render: (a) => describeScope(a) },
    { key: "assignedBy", header: "Assigned by", render: (a) => a.assignedBy },
    { key: "createdAt", header: "Assigned", className: "font-mono text-xs", render: (a) => formatDateTime(a.createdAt) },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (a) => (
        <button
          type="button"
          disabled={pendingRevokeId === a.id}
          onClick={() => handleRevoke(a)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text-primary disabled:opacity-60"
        >
          Revoke
        </button>
      ),
    },
  ];

  const editingRole = roles.find((r) => r.id === editingRoleId);

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-primary">Roles &amp; assignments</h1>
        <p className="mt-1 text-sm text-text-secondary">
          A user is only eligible to review or sign once their assigned role grants the right
          permission — DocumentSign for signing steps — at the document's site and department.
        </p>
      </div>

      {/* Roles */}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-text-primary">Roles</h2>

        {roleError && <ErrorBanner message={roleError} />}

        <form onSubmit={handleCreateRole} className="mb-4 flex flex-wrap items-end gap-3">
          <div className="w-40">
            <label htmlFor="roleCode" className="mb-[6px] block text-xs font-semibold text-text-primary">Code</label>
            <input id="roleCode" value={newRoleCode} onChange={(e) => setNewRoleCode(e.target.value)} placeholder="QA_REVIEWER" className={inputClasses} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="roleName" className="mb-[6px] block text-xs font-semibold text-text-primary">Name</label>
            <input id="roleName" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="QA Reviewer" className={inputClasses} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="roleDescription" className="mb-[6px] block text-xs font-semibold text-text-primary">
              Description <span className="font-normal text-text-tertiary">(optional)</span>
            </label>
            <input id="roleDescription" value={newRoleDescription} onChange={(e) => setNewRoleDescription(e.target.value)} className={inputClasses} />
          </div>
          <button
            type="submit"
            disabled={isCreatingRole}
            className="flex items-center gap-1.5 rounded-[9px] bg-brand px-3.5 py-[9px] text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isCreatingRole ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            Add role
          </button>
        </form>

        <DataTable
          columns={roleColumns}
          rows={roles}
          getRowKey={(r) => r.id}
          isLoading={isLoadingRoles}
          skeletonRowCount={3}
          emptyState={<EmptyState icon={ShieldCheck} title="No roles yet" description="Add one above, then grant it permissions." />}
        />

        {editingRole && (
          <div className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
            <h3 className="mb-3 text-sm font-semibold text-text-primary">
              Permissions for {editingRole.name} <span className="font-mono text-text-tertiary">({editingRole.code})</span>
            </h3>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {allPermissions.map((permission) => (
                <label key={permission} className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={editingPermissions.has(permission)}
                    onChange={() => togglePermission(permission)}
                    className="h-4 w-4 rounded border-border text-brand focus:ring-brand-tint"
                  />
                  {permission}
                </label>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isSavingPermissions}
                onClick={handleSavePermissions}
                className="flex items-center gap-1.5 rounded-[9px] bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingPermissions && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Save permissions
              </button>
              <button
                type="button"
                onClick={() => setEditingRoleId(null)}
                className="rounded-[9px] px-3.5 py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Assignments */}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-text-primary">Assignments</h2>

        {assignmentError && <ErrorBanner message={assignmentError} />}

        <form onSubmit={handleAssign} className="mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[180px]">
            <label htmlFor="assignUser" className="mb-[6px] block text-xs font-semibold text-text-primary">User</label>
            <select id="assignUser" value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} className={inputClasses}>
              <option value="">Select…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.userName} — {u.fullName}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px]">
            <label htmlFor="assignRole" className="mb-[6px] block text-xs font-semibold text-text-primary">Role</label>
            <select id="assignRole" value={assignRoleId} onChange={(e) => setAssignRoleId(e.target.value)} className={inputClasses}>
              <option value="">Select…</option>
              {activeRoles.map((r) => (
                <option key={r.id} value={r.id}>{r.code} — {r.name}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label htmlFor="assignSite" className="mb-[6px] block text-xs font-semibold text-text-primary">
              Site <span className="font-normal text-text-tertiary">(blank = Global)</span>
            </label>
            <select
              id="assignSite"
              value={assignSiteId}
              onChange={(e) => {
                setAssignSiteId(e.target.value);
                setAssignDepartmentId("");
              }}
              className={inputClasses}
            >
              <option value="">Global</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label htmlFor="assignDepartment" className="mb-[6px] block text-xs font-semibold text-text-primary">
              Department <span className="font-normal text-text-tertiary">(optional)</span>
            </label>
            <select
              id="assignDepartment"
              disabled={!assignSiteId}
              value={assignDepartmentId}
              onChange={(e) => setAssignDepartmentId(e.target.value)}
              className={`${inputClasses} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <option value="">Whole site</option>
              {departmentsForAssignSite.map((d) => (
                <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isAssigning}
            className="flex items-center gap-1.5 rounded-[9px] bg-brand px-3.5 py-[9px] text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            Assign
          </button>
        </form>

        <DataTable
          columns={assignmentColumns}
          rows={assignments}
          getRowKey={(a) => a.id}
          isLoading={isLoadingAssignments}
          skeletonRowCount={3}
          emptyState={<EmptyState icon={ShieldCheck} title="No assignments yet" description="Assign a role to a user above." />}
        />
      </section>
    </div>
  );
}
