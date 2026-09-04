import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2, Paperclip, Plus } from "lucide-react";
import { createAnnexure, listAnnexures } from "@/api/documents";
import { ApiError } from "@/lib/api-client";
import { useOrganisationData } from "@/features/organisation/useOrganisationData";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import type { DocumentSummary } from "@/types/documents";

const inputClasses =
  "w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[9px] text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand-tint";

/**
 * A document's annexures — the forms, checklists and record sheets that belong to it.
 *
 * An annexure is a controlled document in its own right (own number, own file, own controlled
 * copies) but is never separately approvable: it is reviewed, approved, issued and withdrawn
 * with its parent. That is why this section offers only "add" and never a lifecycle action —
 * the backend refuses those on an annexure, and a button that always errors is worse than no
 * button.
 *
 * Adding is offered only while the parent is a Draft. On an effective document, new content
 * entering force without passing a signature route is exactly what the review cycle exists to
 * prevent — so the answer there is to revise the parent.
 */
export function DocumentAnnexuresSection({
  parent,
  onAdded,
}: {
  parent: DocumentSummary;
  onAdded?: () => void;
}) {
  const navigate = useNavigate();
  const { documentTypes } = useOrganisationData();

  const [annexures, setAnnexures] = useState<DocumentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ title: "", documentTypeId: "" });

  const canAdd = parent.status === "Draft";

  function refresh() {
    setIsLoading(true);
    listAnnexures(parent.id)
      .then(setAnnexures)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Could not load annexures."),
      )
      .finally(() => setIsLoading(false));
  }

  useEffect(refresh, [parent.id]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError("An annexure title is required.");
      return;
    }
    if (!form.documentTypeId) {
      setError("Choose a document type for the annexure.");
      return;
    }

    setIsSaving(true);
    try {
      await createAnnexure(parent.id, {
        title: form.title.trim(),
        documentTypeId: form.documentTypeId,
      });
      setForm({ title: "", documentTypeId: "" });
      setShowForm(false);
      refresh();
      onAdded?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add that annexure.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns: DataTableColumn<DocumentSummary>[] = [
    {
      key: "annexureNumber",
      header: "#",
      className: "font-mono",
      render: (a) => `A${a.annexureNumber ?? "?"}`,
    },
    {
      key: "documentNumber",
      header: "Number",
      className: "font-mono text-xs",
      render: (a) => a.documentNumber,
    },
    { key: "title", header: "Title", render: (a) => <span className="font-medium">{a.title}</span> },
    { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
  ];

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
          <Paperclip className="h-4 w-4" aria-hidden="true" />
          Annexures
        </h2>

        {canAdd && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add annexure
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="mb-3 flex items-start gap-2.5 rounded-[9px] border border-danger/25 bg-danger-tint px-3.5 py-2.5 text-[13px] text-[#9c332f]">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={annexures}
        getRowKey={(a) => a.id}
        isLoading={isLoading}
        skeletonRowCount={2}
        onRowClick={(a) => navigate(`/documents/${a.id}`)}
        emptyState={
          <EmptyState
            icon={Paperclip}
            title="No annexures"
            description={
              canAdd
                ? "Forms, checklists and record sheets belonging to this document appear here."
                : "Annexures can only be added while the document is a Draft."
            }
          />
        }
      />

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
          <h3 className="mb-1 font-display text-sm font-semibold text-text-primary">Add an annexure</h3>
          <p className="mb-3 text-xs text-text-secondary">
            It takes its number from this document — {parent.documentNumber}-A
            {annexures.length + 1} — and is approved, issued and withdrawn along with it.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold text-text-primary sm:col-span-2">
              Title
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Cleaning Record Form"
                className={`mt-1 ${inputClasses}`}
              />
            </label>

            <label className="text-xs font-semibold text-text-primary">
              Document type
              <select
                value={form.documentTypeId}
                onChange={(e) => setForm({ ...form, documentTypeId: e.target.value })}
                className={`mt-1 ${inputClasses}`}
              >
                <option value="">Choose…</option>
                {documentTypes
                  .filter((t) => t.isActive)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} — {t.name}
                    </option>
                  ))}
              </select>
              <span className="mt-1 block text-xs font-normal text-text-tertiary">
                Usually a form type, not this document's own — a record sheet looks nothing like
                a procedure.
              </span>
            </label>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Add annexure
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
