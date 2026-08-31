import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Building2, Loader2, Network, Tag } from "lucide-react";
import { createSite, listSites } from "@/api/sites";
import { createDepartment, listDepartments } from "@/api/departments";
import {
  createDocumentType,
  deactivateDocumentType,
  listDocumentTypes,
  reactivateDocumentType,
} from "@/api/documentTypes";
import { ApiError } from "@/lib/api-client";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import type { DepartmentSummary, SiteSummary } from "@/types/organisation";
import type { DocumentTypeSummary } from "@/types/document-types";

const inputClasses =
  "w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[9px] text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand-tint";

/**
 * Sites, departments and document types — the master data everything else in DMS is built on.
 *
 * This is the screen a fresh installation starts from: without at least one site, one
 * department and one document type, no numbering rule can be scoped, no policy can be set and
 * no document can be created at all. It's grouped onto one page for that reason — they're
 * configured together, once, at setup.
 *
 * Codes are treated as permanent throughout. A site code appears inside every document number
 * issued under it via the {SITE} token, so changing one later would either invalidate existing
 * numbers or silently desynchronise them from the register. The backend has no update
 * endpoint for any of the three, and that's a deliberate constraint rather than an omission.
 */
export function OrganisationAdminPage() {
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [includeInactive, setIncludeInactive] = useState(false);

  const [siteForm, setSiteForm] = useState({ code: "", name: "" });
  const [deptForm, setDeptForm] = useState({ siteId: "", code: "", name: "" });
  const [typeForm, setTypeForm] = useState({ code: "", name: "" });
  const [saving, setSaving] = useState<"site" | "dept" | "type" | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([
      listSites(includeInactive),
      listDepartments(undefined, includeInactive),
      listDocumentTypes(includeInactive),
    ])
      .then(([s, d, t]) => {
        setSites(s);
        setDepartments(d);
        setDocumentTypes(t);
      })
      .catch((err: unknown) =>
        setError(
          err instanceof ApiError ? err.message : "Could not load the organisation structure.",
        ),
      )
      .finally(() => setIsLoading(false));
  }, [refreshToken, includeInactive]);

  async function handleCreateSite(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!siteForm.code.trim() || !siteForm.name.trim()) {
      setError("A site needs both a code and a name.");
      return;
    }
    setSaving("site");
    try {
      await createSite({ code: siteForm.code.trim(), name: siteForm.name.trim() });
      setSiteForm({ code: "", name: "" });
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create that site.");
    } finally {
      setSaving(null);
    }
  }

  async function handleCreateDepartment(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!deptForm.siteId) {
      setError("Choose which site this department belongs to.");
      return;
    }
    if (!deptForm.code.trim() || !deptForm.name.trim()) {
      setError("A department needs both a code and a name.");
      return;
    }
    setSaving("dept");
    try {
      await createDepartment({
        siteId: deptForm.siteId,
        code: deptForm.code.trim(),
        name: deptForm.name.trim(),
      });
      setDeptForm({ siteId: deptForm.siteId, code: "", name: "" });
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create that department.");
    } finally {
      setSaving(null);
    }
  }

  async function handleCreateType(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!typeForm.code.trim() || !typeForm.name.trim()) {
      setError("A document type needs both a code and a name.");
      return;
    }
    setSaving("type");
    try {
      await createDocumentType({ code: typeForm.code.trim(), name: typeForm.name.trim() });
      setTypeForm({ code: "", name: "" });
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create that document type.");
    } finally {
      setSaving(null);
    }
  }

  async function toggleType(type: DocumentTypeSummary) {
    try {
      if (type.isActive) {
        await deactivateDocumentType(type.id);
      } else {
        await reactivateDocumentType(type.id);
      }
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change that document type.");
    }
  }

  const siteName = (id: string) => sites.find((s) => s.id === id)?.name ?? id;

  const siteColumns: DataTableColumn<SiteSummary>[] = [
    { key: "code", header: "Code", className: "font-mono", render: (s) => s.code },
    { key: "name", header: "Name", render: (s) => <span className="font-medium">{s.name}</span> },
    {
      key: "departments",
      header: "Departments",
      className: "font-mono text-xs",
      render: (s) => departments.filter((d) => d.siteId === s.id).length,
    },
    {
      key: "active",
      header: "Status",
      render: (s) => (s.isActive ? "Active" : <span className="text-text-tertiary">Inactive</span>),
    },
  ];

  const deptColumns: DataTableColumn<DepartmentSummary>[] = [
    { key: "code", header: "Code", className: "font-mono", render: (d) => d.code },
    { key: "name", header: "Name", render: (d) => <span className="font-medium">{d.name}</span> },
    { key: "site", header: "Site", render: (d) => siteName(d.siteId) },
    {
      key: "active",
      header: "Status",
      render: (d) => (d.isActive ? "Active" : <span className="text-text-tertiary">Inactive</span>),
    },
  ];

  const typeColumns: DataTableColumn<DocumentTypeSummary>[] = [
    { key: "code", header: "Code", className: "font-mono", render: (t) => t.code },
    { key: "name", header: "Name", render: (t) => <span className="font-medium">{t.name}</span> },
    {
      key: "active",
      header: "Status",
      render: (t) => (t.isActive ? "Active" : <span className="text-text-tertiary">Inactive</span>),
    },
    {
      key: "actions",
      header: "",
      render: (t) => (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => toggleType(t)}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface"
          >
            {t.isActive ? "Deactivate" : "Reactivate"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Organisation"
        description="Sites, departments and document types. Everything else — numbering, policies, metadata, documents themselves — is scoped by these, so a new installation starts here."
      />

      <label className="mb-4 flex w-fit items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={includeInactive}
          onChange={(e) => setIncludeInactive(e.target.checked)}
          className="h-4 w-4 rounded border-border text-brand focus:ring-brand-tint"
        />
        Show inactive
      </label>

      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-[9px] border border-danger/25 bg-danger-tint px-3.5 py-2.5 text-[13px] text-[#9c332f]">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------ sites */}
      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
          <Building2 className="h-4 w-4" aria-hidden="true" />
          Sites
        </h2>

        <DataTable
          columns={siteColumns}
          rows={sites}
          getRowKey={(s) => s.id}
          isLoading={isLoading}
          skeletonRowCount={2}
          emptyState={
            <EmptyState
              icon={Building2}
              title="No sites yet"
              description="Add the first site to begin — departments and documents both hang off it."
            />
          }
        />

        <form onSubmit={handleCreateSite} className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
          <h3 className="mb-1 font-display text-sm font-semibold text-text-primary">Add a site</h3>
          <p className="mb-3 text-xs text-text-secondary">
            The code appears inside document numbers via the <code className="font-mono">{"{SITE}"}</code>{" "}
            token. Choose carefully — it can't be changed once documents are numbered under it.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold text-text-primary">
              Code
              <input
                value={siteForm.code}
                onChange={(e) => setSiteForm({ ...siteForm, code: e.target.value })}
                placeholder="HYD"
                className={`mt-1 font-mono ${inputClasses}`}
              />
            </label>
            <label className="text-xs font-semibold text-text-primary sm:col-span-2">
              Name
              <input
                value={siteForm.name}
                onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                placeholder="Hyderabad Plant"
                className={`mt-1 ${inputClasses}`}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving === "site"}
            className="mt-3 flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {saving === "site" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Add site
          </button>
        </form>
      </section>

      {/* ------------------------------------------------------------ departments */}
      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
          <Network className="h-4 w-4" aria-hidden="true" />
          Departments
        </h2>

        <DataTable
          columns={deptColumns}
          rows={departments}
          getRowKey={(d) => d.id}
          isLoading={isLoading}
          skeletonRowCount={2}
          emptyState={
            <EmptyState
              icon={Network}
              title="No departments yet"
              description="Departments own documents and appear in numbering via the {DEPT} token."
            />
          }
        />

        <form onSubmit={handleCreateDepartment} className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
          <h3 className="mb-1 font-display text-sm font-semibold text-text-primary">Add a department</h3>
          <p className="mb-3 text-xs text-text-secondary">
            Codes are unique per site, not globally — every plant can have its own QA.
          </p>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-xs font-semibold text-text-primary">
              Site
              <select
                value={deptForm.siteId}
                onChange={(e) => setDeptForm({ ...deptForm, siteId: e.target.value })}
                className={`mt-1 ${inputClasses}`}
              >
                <option value="">Choose…</option>
                {sites
                  .filter((s) => s.isActive)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-text-primary">
              Code
              <input
                value={deptForm.code}
                onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                placeholder="QA"
                className={`mt-1 font-mono ${inputClasses}`}
              />
            </label>
            <label className="text-xs font-semibold text-text-primary sm:col-span-2">
              Name
              <input
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                placeholder="Quality Assurance"
                className={`mt-1 ${inputClasses}`}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving === "dept" || sites.length === 0}
            className="mt-3 flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {saving === "dept" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Add department
          </button>
          {sites.length === 0 && (
            <p className="mt-2 text-xs text-text-tertiary">Add a site first.</p>
          )}
        </form>
      </section>

      {/* --------------------------------------------------------- document types */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
          <Tag className="h-4 w-4" aria-hidden="true" />
          Document types
        </h2>

        <DataTable
          columns={typeColumns}
          rows={documentTypes}
          getRowKey={(t) => t.id}
          isLoading={isLoading}
          skeletonRowCount={3}
          emptyState={
            <EmptyState
              icon={Tag}
              title="No document types yet"
              description="SOP, Policy, Work Instruction — whatever categories your quality system uses."
            />
          }
        />

        <form onSubmit={handleCreateType} className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
          <h3 className="mb-1 font-display text-sm font-semibold text-text-primary">Add a document type</h3>
          <p className="mb-3 text-xs text-text-secondary">
            Deactivating a type stops new documents being created under it; existing documents
            are untouched.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold text-text-primary">
              Code
              <input
                value={typeForm.code}
                onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                placeholder="SOP"
                className={`mt-1 font-mono ${inputClasses}`}
              />
            </label>
            <label className="text-xs font-semibold text-text-primary sm:col-span-2">
              Name
              <input
                value={typeForm.name}
                onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                placeholder="Standard Operating Procedure"
                className={`mt-1 ${inputClasses}`}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving === "type"}
            className="mt-3 flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {saving === "type" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Add document type
          </button>
        </form>
      </section>
    </div>
  );
}
