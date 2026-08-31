import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, CalendarClock, Loader2, Archive } from "lucide-react";
import {
  createRetentionPolicy,
  createReviewPolicy,
  listRetentionPolicies,
  listReviewPolicies,
  updateRetentionPolicy,
  updateReviewPolicy,
} from "@/api/lifecycle";
import { ApiError } from "@/lib/api-client";
import { useOrganisationData } from "@/features/organisation/useOrganisationData";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import type {
  RetentionPolicyView,
  RetentionTrigger,
  ReviewPolicyView,
} from "@/types/lifecycle";

const inputClasses =
  "w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[9px] text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand-tint";

const TRIGGERS: RetentionTrigger[] = ["Superseded", "Obsolete"];

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

/**
 * Review and retention policies, on one screen because they answer two halves of the same
 * question: how long a document stays trustworthy, and how long its record must be kept
 * afterwards.
 *
 * Both are scoped per document type, optionally narrowed to one site. A site-specific policy
 * wins over the organisation-wide one — the backend resolves that, and this screen only has
 * to make the scope legible.
 */
export function PoliciesAdminPage() {
  const { documentTypes, sites } = useOrganisationData();

  const [reviewPolicies, setReviewPolicies] = useState<ReviewPolicyView[]>([]);
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicyView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const [reviewForm, setReviewForm] = useState({ documentTypeId: "", siteId: "", months: "24" });
  const [retentionForm, setRetentionForm] = useState({
    documentTypeId: "",
    siteId: "",
    years: "10",
    trigger: "Superseded" as RetentionTrigger,
  });
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [isSavingRetention, setIsSavingRetention] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([listReviewPolicies(), listRetentionPolicies()])
      .then(([review, retention]) => {
        setReviewPolicies(review);
        setRetentionPolicies(retention);
      })
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Could not load policies."),
      )
      .finally(() => setIsLoading(false));
  }, [refreshToken]);

  async function handleCreateReview(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!reviewForm.documentTypeId) {
      setError("Choose a document type for the review policy.");
      return;
    }

    setIsSavingReview(true);
    try {
      await createReviewPolicy({
        documentTypeId: reviewForm.documentTypeId,
        siteId: reviewForm.siteId || null,
        reviewIntervalMonths: Number(reviewForm.months),
      });
      setReviewForm({ documentTypeId: "", siteId: "", months: "24" });
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save that review policy.");
    } finally {
      setIsSavingReview(false);
    }
  }

  async function handleCreateRetention(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!retentionForm.documentTypeId) {
      setError("Choose a document type for the retention policy.");
      return;
    }

    setIsSavingRetention(true);
    try {
      await createRetentionPolicy({
        documentTypeId: retentionForm.documentTypeId,
        siteId: retentionForm.siteId || null,
        retentionYears: Number(retentionForm.years),
        trigger: retentionForm.trigger,
      });
      setRetentionForm({ documentTypeId: "", siteId: "", years: "10", trigger: "Superseded" });
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save that retention policy.");
    } finally {
      setIsSavingRetention(false);
    }
  }

  async function handleReviewIntervalChange(policy: ReviewPolicyView, months: number) {
    try {
      await updateReviewPolicy(policy.id, { reviewIntervalMonths: months });
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update that policy.");
    }
  }

  async function handleRetentionChange(
    policy: RetentionPolicyView,
    years: number,
    trigger: RetentionTrigger,
  ) {
    try {
      await updateRetentionPolicy(policy.id, { retentionYears: years, trigger });
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update that policy.");
    }
  }

  const reviewColumns: DataTableColumn<ReviewPolicyView>[] = [
    { key: "type", header: "Document type", className: "font-mono", render: (p) => p.documentTypeCode },
    { key: "scope", header: "Scope", render: (p) => p.scope },
    {
      key: "interval",
      header: "Review every",
      render: (p) => (
        <select
          value={p.reviewIntervalMonths}
          onChange={(e) => handleReviewIntervalChange(p, Number(e.target.value))}
          className="rounded-md border border-border bg-surface-raised px-2 py-1 text-sm"
        >
          {[6, 12, 18, 24, 36, 48, 60].map((m) => (
            <option key={m} value={m}>
              {m} months
            </option>
          ))}
        </select>
      ),
    },
    { key: "createdBy", header: "Set by", className: "text-xs", render: (p) => p.createdBy },
  ];

  const retentionColumns: DataTableColumn<RetentionPolicyView>[] = [
    { key: "type", header: "Document type", className: "font-mono", render: (p) => p.documentTypeCode },
    { key: "scope", header: "Scope", render: (p) => p.scope },
    {
      key: "years",
      header: "Retain for",
      render: (p) => (
        <select
          value={p.retentionYears}
          onChange={(e) => handleRetentionChange(p, Number(e.target.value), p.trigger)}
          className="rounded-md border border-border bg-surface-raised px-2 py-1 text-sm"
        >
          {[1, 3, 5, 7, 10, 15, 20, 30].map((y) => (
            <option key={y} value={y}>
              {y} years
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "trigger",
      header: "Counted from",
      render: (p) => (
        <select
          value={p.trigger}
          onChange={(e) => handleRetentionChange(p, p.retentionYears, e.target.value as RetentionTrigger)}
          className="rounded-md border border-border bg-surface-raised px-2 py-1 text-sm"
        >
          {TRIGGERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      ),
    },
    { key: "createdBy", header: "Set by", className: "text-xs", render: (p) => p.createdBy },
  ];

  return (
    <div>
      <PageHeader
        title="Review & retention policies"
        description="How often each document type must be re-reviewed, and how long its record is kept once superseded or withdrawn."
      />

      {error && <ErrorBanner message={error} />}

      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
          Review policies
        </h2>

        <DataTable
          columns={reviewColumns}
          rows={reviewPolicies}
          getRowKey={(p) => p.id}
          isLoading={isLoading}
          skeletonRowCount={3}
          emptyState={
            <EmptyState
              icon={CalendarClock}
              title="No review policies"
              description="Without one, documents of that type get no review date and never appear on the reviews-due worklist."
            />
          }
        />

        <form onSubmit={handleCreateReview} className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
          <h3 className="mb-3 font-display text-sm font-semibold text-text-primary">Add a review policy</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold text-text-primary">
              Document type
              <select
                value={reviewForm.documentTypeId}
                onChange={(e) => setReviewForm({ ...reviewForm, documentTypeId: e.target.value })}
                className={`mt-1 ${inputClasses}`}
              >
                <option value="">Choose…</option>
                {documentTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} — {t.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-text-primary">
              Site (optional override)
              <select
                value={reviewForm.siteId}
                onChange={(e) => setReviewForm({ ...reviewForm, siteId: e.target.value })}
                className={`mt-1 ${inputClasses}`}
              >
                <option value="">All sites</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-text-primary">
              Review every (months)
              <input
                type="number"
                min={1}
                max={240}
                value={reviewForm.months}
                onChange={(e) => setReviewForm({ ...reviewForm, months: e.target.value })}
                className={`mt-1 ${inputClasses}`}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isSavingReview}
            className="mt-3 flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {isSavingReview && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Add policy
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
          <Archive className="h-4 w-4" aria-hidden="true" />
          Retention policies
        </h2>

        <DataTable
          columns={retentionColumns}
          rows={retentionPolicies}
          getRowKey={(p) => p.id}
          isLoading={isLoading}
          skeletonRowCount={3}
          emptyState={
            <EmptyState
              icon={Archive}
              title="No retention policies"
              description="Without one, superseded records are kept indefinitely — safe, but they never become eligible for disposition."
            />
          }
        />

        <form onSubmit={handleCreateRetention} className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
          <h3 className="mb-3 font-display text-sm font-semibold text-text-primary">Add a retention policy</h3>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-xs font-semibold text-text-primary">
              Document type
              <select
                value={retentionForm.documentTypeId}
                onChange={(e) =>
                  setRetentionForm({ ...retentionForm, documentTypeId: e.target.value })
                }
                className={`mt-1 ${inputClasses}`}
              >
                <option value="">Choose…</option>
                {documentTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} — {t.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-text-primary">
              Site (optional override)
              <select
                value={retentionForm.siteId}
                onChange={(e) => setRetentionForm({ ...retentionForm, siteId: e.target.value })}
                className={`mt-1 ${inputClasses}`}
              >
                <option value="">All sites</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-text-primary">
              Retain for (years)
              <input
                type="number"
                min={1}
                max={100}
                value={retentionForm.years}
                onChange={(e) => setRetentionForm({ ...retentionForm, years: e.target.value })}
                className={`mt-1 ${inputClasses}`}
              />
            </label>

            <label className="text-xs font-semibold text-text-primary">
              Counted from
              <select
                value={retentionForm.trigger}
                onChange={(e) =>
                  setRetentionForm({ ...retentionForm, trigger: e.target.value as RetentionTrigger })
                }
                className={`mt-1 ${inputClasses}`}
              >
                {TRIGGERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSavingRetention}
            className="mt-3 flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {isSavingRetention && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Add policy
          </button>
        </form>
      </section>
    </div>
  );
}
