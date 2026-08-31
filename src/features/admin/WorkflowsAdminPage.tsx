import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, GitBranch, Loader2, Plus, Trash2 } from "lucide-react";
import { activateWorkflow, createWorkflow, deactivateWorkflow, listWorkflows } from "@/api/workflows";
import { listRoles } from "@/api/roles";
import { ApiError } from "@/lib/api-client";
import { useOrganisationData } from "@/features/organisation/useOrganisationData";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import type { RoleView } from "@/types/access";
import type { SignatureRole, WorkflowStepRequest, WorkflowView } from "@/types/workflows";

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

const emptyStep = (): WorkflowStepRequest => ({ roleId: "", role: "Reviewer", stepLabel: "" });

export function WorkflowsAdminPage() {
  const { documentTypes, sites } = useOrganisationData();

  const [roles, setRoles] = useState<RoleView[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [workflows, setWorkflows] = useState<WorkflowView[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [siteId, setSiteId] = useState("");
  const [steps, setSteps] = useState<WorkflowStepRequest[]>([emptyStep()]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    listRoles(false).then(setRoles).catch(() => undefined);
  }, []);

  function refreshWorkflows(documentTypeId: string) {
    if (!documentTypeId) {
      setWorkflows([]);
      return;
    }
    setIsLoadingWorkflows(true);
    setError(null);
    listWorkflows(documentTypeId)
      .then(setWorkflows)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Could not load workflows."))
      .finally(() => setIsLoadingWorkflows(false));
  }

  useEffect(() => {
    refreshWorkflows(selectedTypeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshWorkflows is stable in intent
  }, [selectedTypeId]);

  function updateStep(index: number, patch: Partial<WorkflowStepRequest>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addStep() {
    setSteps((prev) => [...prev, emptyStep()]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!selectedTypeId) {
      setError("Choose a document type first.");
      return;
    }
    if (!name.trim()) {
      setError("A name is required.");
      return;
    }
    if (steps.length === 0 || steps.some((s) => !s.roleId || !s.stepLabel.trim())) {
      setError("Every step needs a role and a label. Remove any incomplete step.");
      return;
    }

    setIsCreating(true);
    try {
      await createWorkflow({
        documentTypeId: selectedTypeId,
        siteId: siteId || null,
        name: name.trim(),
        steps: steps.map((s) => ({ ...s, stepLabel: s.stepLabel.trim() })),
      });
      setName("");
      setSiteId("");
      setSteps([emptyStep()]);
      refreshWorkflows(selectedTypeId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the workflow.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleActive(workflow: WorkflowView) {
    setError(null);
    setPendingId(workflow.id);
    try {
      if (workflow.isActive) {
        await deactivateWorkflow(workflow.id);
      } else {
        await activateWorkflow(workflow.id);
      }
      refreshWorkflows(selectedTypeId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the workflow.");
    } finally {
      setPendingId(null);
    }
  }

  const columns: DataTableColumn<WorkflowView>[] = [
    { key: "name", header: "Name", render: (w) => w.name },
    { key: "scope", header: "Scope", render: (w) => w.scope },
    { key: "version", header: "Ver", className: "font-mono", render: (w) => `v${w.version}` },
    {
      key: "steps",
      header: "Steps",
      render: (w) => (
        <span className="text-xs text-text-secondary">
          {w.steps
            .slice()
            .sort((a, b) => a.stepOrder - b.stepOrder)
            .map((s) => `${s.stepOrder}. ${s.roleCode} (${s.role})`)
            .join(" → ")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (w) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            w.isActive ? "bg-brand-tint text-brand" : "bg-text-tertiary/10 text-text-tertiary"
          }`}
        >
          {w.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (w) => (
        <button
          type="button"
          disabled={pendingId === w.id}
          onClick={() => handleToggleActive(w)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text-primary disabled:opacity-60"
        >
          {w.isActive ? "Deactivate" : "Activate"}
        </button>
      ),
    },
  ];

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1.5 font-display text-2xl font-semibold text-text-primary">Review routes</h1>
      <p className="mb-6 text-sm text-text-secondary">
        The ordered sequence of roles a document type's Draft must pass through — Submit for
        Review reads this. Only one route can be Active per document type (optionally narrowed
        to one site) at a time. To change an existing route's steps, create a new version here
        and activate it; there's no in-place step editor yet.
      </p>

      <div className="mb-6 w-72">
        <label htmlFor="workflowType" className="mb-[6px] block text-xs font-semibold text-text-primary">Document type</label>
        <select id="workflowType" value={selectedTypeId} onChange={(e) => setSelectedTypeId(e.target.value)} className={inputClasses}>
          <option value="">Select a document type…</option>
          {documentTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.code} — {t.name}</option>
          ))}
        </select>
      </div>

      {selectedTypeId && (
        <>
          {error && <ErrorBanner message={error} />}

          <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-border bg-surface-raised p-4">
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="flex-1 min-w-[220px]">
                <label htmlFor="workflowName" className="mb-[6px] block text-xs font-semibold text-text-primary">Name</label>
                <input id="workflowName" value={name} onChange={(e) => setName(e.target.value)} placeholder="SOP review — 2 step" className={inputClasses} />
              </div>
              <div className="min-w-[200px]">
                <label htmlFor="workflowSite" className="mb-[6px] block text-xs font-semibold text-text-primary">
                  Site <span className="font-normal text-text-tertiary">(blank = all sites)</span>
                </label>
                <select id="workflowSite" value={siteId} onChange={(e) => setSiteId(e.target.value)} className={inputClasses}>
                  <option value="">All sites</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-2 text-xs font-semibold text-text-primary">Steps, in order</div>
            <div className="mb-3 space-y-2">
              {steps.map((step, index) => (
                <div key={index} className="flex flex-wrap items-end gap-2">
                  <span className="pb-2.5 text-xs font-mono text-text-tertiary">{index + 1}.</span>
                  <div className="min-w-[180px]">
                    <select
                      value={step.roleId}
                      onChange={(e) => updateStep(index, { roleId: e.target.value })}
                      className={inputClasses}
                    >
                      <option value="">Role…</option>
                      {roles.filter((r) => r.isActive).map((r) => (
                        <option key={r.id} value={r.id}>{r.code} — {r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-[140px]">
                    <select
                      value={step.role}
                      onChange={(e) => updateStep(index, { role: e.target.value as SignatureRole })}
                      className={inputClasses}
                    >
                      <option value="Reviewer">Reviewer</option>
                      <option value="Approver">Approver</option>
                    </select>
                  </div>
                  <div className="min-w-[200px] flex-1">
                    <input
                      value={step.stepLabel}
                      onChange={(e) => updateStep(index, { stepLabel: e.target.value })}
                      placeholder="Step label, e.g. QA Review"
                      className={inputClasses}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    disabled={steps.length === 1}
                    title="Remove step"
                    className="rounded-lg border border-border p-2 text-text-secondary transition-colors hover:bg-surface hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={addStep}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add step
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="flex items-center gap-1.5 rounded-[9px] bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Create route
              </button>
            </div>
          </form>

          <DataTable
            columns={columns}
            rows={workflows}
            getRowKey={(w) => w.id}
            isLoading={isLoadingWorkflows}
            skeletonRowCount={2}
            emptyState={
              <EmptyState icon={GitBranch} title="No review routes for this type yet" description="Build one above." />
            }
          />
        </>
      )}
    </div>
  );
}
