import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Globe2, Loader2 } from "lucide-react";
import { adoptDocument, listAdoptions, withdrawAdoption } from "@/api/collaboration";
import { ApiError } from "@/lib/api-client";
import { formatDateOnly, formatDateTime } from "@/lib/format";
import { useOrganisationData } from "@/features/organisation/useOrganisationData";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { AdoptionView } from "@/types/collaboration";
import type { DocumentSummary } from "@/types/documents";

const inputClasses =
  "w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[9px] text-[14px] text-text-primary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand-tint";

/**
 * Which sites have adopted this global document.
 *
 * An adoption records that a site accepts the document — it holds no content, because the
 * adopting site takes the text verbatim and has no authority to change it. One document, many
 * adoptions, and no way for a site's version to drift from the master.
 *
 * Withdrawn adoptions stay listed. "This site followed it from March to September" is exactly
 * what an inspector asks about, and removing the row would lose it.
 */
export function DocumentAdoptionsSection({ document }: { document: DocumentSummary }) {
  const { sites, getSiteName } = useOrganisationData();

  const [adoptions, setAdoptions] = useState<AdoptionView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toWithdraw, setToWithdraw] = useState<AdoptionView | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ siteId: "", effectiveDate: "", note: "" });
  const [isSaving, setIsSaving] = useState(false);

  // Only the effective, current revision of a global document can be adopted. The backend
  // refuses anything else, so the form is hidden rather than left to fail.
  const canAdopt =
    document.scope === "Global" && document.status === "Effective" && document.isCurrentRevision;

  function refresh() {
    setIsLoading(true);
    listAdoptions(document.id)
      .then(setAdoptions)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Could not load adoptions."),
      )
      .finally(() => setIsLoading(false));
  }

  useEffect(refresh, [document.id]);

  // The owning site is excluded: the document is already in force there through its own
  // lifecycle, and an adoption would imply it had to accept its own document.
  const adoptedSiteIds = new Set(adoptions.filter((a) => a.isActive).map((a) => a.siteId));
  const availableSites = sites.filter(
    (s) => s.isActive && s.id !== document.siteId && !adoptedSiteIds.has(s.id),
  );

  async function handleAdopt(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!form.siteId || !form.effectiveDate) {
      setError("Choose a site and an effective date.");
      return;
    }

    setIsSaving(true);
    try {
      await adoptDocument(document.id, {
        siteId: form.siteId,
        effectiveDate: form.effectiveDate,
        note: form.note.trim() || null,
      });
      setForm({ siteId: "", effectiveDate: "", note: "" });
      setShowForm(false);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record that adoption.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns: DataTableColumn<AdoptionView>[] = [
    {
      key: "site",
      header: "Site",
      render: (a) => <span className="font-medium">{getSiteName(a.siteId)}</span>,
    },
    {
      key: "effectiveDate",
      header: "Effective there",
      className: "font-mono text-xs",
      render: (a) => formatDateOnly(a.effectiveDate),
    },
    {
      key: "adoptedBy",
      header: "Adopted by",
      className: "text-xs",
      render: (a) => (
        <span>
          {a.adoptedBy}
          <span className="block text-text-tertiary">{formatDateTime(a.adoptedAt)}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (a) =>
        a.isActive ? (
          <span className="inline-flex items-center rounded-full bg-stage-effective/10 px-2.5 py-0.5 text-xs font-medium text-stage-effective">
            In force
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-text-tertiary/10 px-2.5 py-0.5 text-xs font-medium text-text-secondary">
            Withdrawn
          </span>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (a) =>
        a.isActive ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setToWithdraw(a)}
              className="rounded-md border border-danger/30 px-2.5 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger-tint"
            >
              Withdraw
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <section className="mb-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
          <Globe2 className="h-4 w-4" aria-hidden="true" />
          Site adoptions
        </h2>

        {canAdopt && !showForm && availableSites.length > 0 && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface"
          >
            Record an adoption
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2.5 rounded-[9px] border border-danger/25 bg-danger-tint px-3.5 py-2.5 text-[13px] text-[#9c332f]"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={adoptions}
        getRowKey={(a) => a.id}
        isLoading={isLoading}
        skeletonRowCount={2}
        emptyState={
          <EmptyState
            icon={Globe2}
            title="No sites have adopted this yet"
            description={
              canAdopt
                ? "A site adopts the document verbatim, choosing when it takes effect there."
                : "Only the effective, current revision of a global document can be adopted."
            }
          />
        }
      />

      {showForm && (
        <form
          onSubmit={handleAdopt}
          className="mt-4 rounded-xl border border-border bg-surface-raised p-4"
        >
          <h3 className="mb-1 font-display text-sm font-semibold text-text-primary">
            Record an adoption
          </h3>
          <p className="mb-3 text-xs text-text-secondary">
            The site takes this document as written. The effective date is usually later than
            today — that gap is the training window.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold text-text-primary">
              Site
              <select
                value={form.siteId}
                onChange={(e) => setForm({ ...form, siteId: e.target.value })}
                className={`mt-1 ${inputClasses}`}
              >
                <option value="">Choose…</option>
                {availableSites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-text-primary">
              Effective there
              <input
                type="date"
                value={form.effectiveDate}
                onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
                className={`mt-1 ${inputClasses}`}
              />
            </label>

            <label className="text-xs font-semibold text-text-primary">
              Note (optional)
              <input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="After training completion"
                className={`mt-1 ${inputClasses}`}
              />
            </label>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Record adoption
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={toWithdraw !== null}
        destructive
        title={`Withdraw ${toWithdraw ? getSiteName(toWithdraw.siteId) : ""}'s adoption?`}
        description="The site stops following this document. The adoption stays on record as having been in force until now — that history is what an inspector asks about."
        confirmLabel="Withdraw adoption"
        reasonLabel="Reason"
        reasonPlaceholder="Why this site is no longer following it"
        onCancel={() => setToWithdraw(null)}
        onConfirm={async (reason) => {
          if (!toWithdraw) return;
          await withdrawAdoption(toWithdraw.id, { reason });
          setToWithdraw(null);
          refresh();
        }}
      />
    </section>
  );
}
