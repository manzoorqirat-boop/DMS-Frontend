import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  CalendarClock,
  Download,
  FilePlus2,
  PackageCheck,
  PenLine,
  ScrollText,
  Settings2,
} from "lucide-react";
import { listReviewDue, listDispositionDue } from "@/api/lifecycle";
import { listPendingRetrieval } from "@/api/distribution";
import { getMyPendingSignatures } from "@/api/review";
import { listDocuments } from "@/api/documents";
import { listAuditEvents } from "@/api/audit";
import { exportMasterList, downloadBlob } from "@/api/exports";
import { ApiError } from "@/lib/api-client";
import { formatDateTime, humanizeAction } from "@/lib/format";
import { LIFECYCLE_STAGES } from "@/lib/lifecycle";
import { useAuth } from "@/features/auth/useAuth";
import { LifecyclePipeline, type StageCount } from "@/features/documents/LifecyclePipeline";
import type { AuditEventView } from "@/types/audit";
import type { DocumentStatus } from "@/types/documents";

interface Worklist {
  label: string;
  count: number | null;
  to: string;
  icon: typeof PenLine;
  description: string;
  /** Mine vs the organisation's — the two are worth separating visually. */
  personal?: boolean;
}

/**
 * The landing screen: what is waiting on the person signed in, what is waiting on the
 * organisation, and where every workflow starts.
 *
 * Every number is fetched from the same endpoint the screen it links to uses, rather than a
 * bespoke summary API. That means the dashboard can never disagree with the page it points at
 * — a dashboard that contradicts its own detail view is worse than no dashboard, because it
 * teaches people not to trust either.
 */
export function Dashboard() {
  const { user } = useAuth();

  const [mySignatures, setMySignatures] = useState<number | null>(null);
  const [reviewsDue, setReviewsDue] = useState<number | null>(null);
  const [copiesOut, setCopiesOut] = useState<number | null>(null);
  const [dispositions, setDispositions] = useState<number | null>(null);
  const [stageCounts, setStageCounts] = useState<StageCount[]>([]);
  const [activity, setActivity] = useState<AuditEventView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    // pageSize=1 throughout: only totalCount is wanted, so there's no reason to transfer rows
    // this screen will never render.
    getMyPendingSignatures()
      .then((items) => !cancelled && setMySignatures(items.length))
      .catch(() => !cancelled && setMySignatures(null));

    listReviewDue({ withinDays: 90, page: 1, pageSize: 1 }, controller.signal)
      .then((r) => setReviewsDue(r.totalCount))
      .catch(() => setReviewsDue(null));

    listPendingRetrieval({ page: 1, pageSize: 1 }, controller.signal)
      .then((r) => setCopiesOut(r.totalCount))
      .catch(() => setCopiesOut(null));

    listDispositionDue({ page: 1, pageSize: 1 }, controller.signal)
      .then((r) => setDispositions(r.totalCount))
      .catch(() => setDispositions(null));

    // One request per stage. Six small counts rather than one big fetch, because the server
    // filters by status and returns the real total — tallying a fetched page would misreport
    // the moment the register outgrows one page.
    Promise.all(
      LIFECYCLE_STAGES.map((stage) =>
        listDocuments(
          {
            status: stage.key as DocumentStatus,
            currentRevisionsOnly: false,
            page: 1,
            pageSize: 1,
          },
          controller.signal,
        )
          .then((r) => ({ key: stage.key, count: r.totalCount }))
          .catch(() => ({ key: stage.key, count: null })),
      ),
    ).then((counts) => !cancelled && setStageCounts(counts));

    listAuditEvents({ page: 1, pageSize: 8 }, controller.signal)
      .then((r) => !cancelled && setActivity(r.items))
      .catch(() => !cancelled && setActivity([]));

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  async function handleExport() {
    setIsExporting(true);
    setError(null);
    try {
      const blob = await exportMasterList({ currentRevisionsOnly: true });
      downloadBlob(blob, `master-list-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not export the master list.");
    } finally {
      setIsExporting(false);
    }
  }

  const worklists: Worklist[] = [
    {
      label: "Waiting on your signature",
      count: mySignatures,
      to: "/my-signatures",
      icon: PenLine,
      personal: true,
      description: "Steps you can act on now, not ones queued behind someone else.",
    },
    {
      label: "Reviews due",
      count: reviewsDue,
      to: "/reports/review-due",
      icon: CalendarClock,
      description: "Approaching or past their periodic review date.",
    },
    {
      label: "Copies to retrieve",
      count: copiesOut,
      to: "/reports/pending-retrieval",
      icon: PackageCheck,
      description: "Still held for superseded or obsolete documents.",
    },
    {
      label: "Awaiting disposition",
      count: dispositions,
      to: "/reports/disposition-due",
      icon: Archive,
      description: "Past retention with no decision recorded.",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero. The one place colour is spent heavily, and it carries the primary action rather
          than being decorative. */}
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-ink-950 via-ink-900 to-ink-800 px-6 py-7 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-brand/20 blur-3xl"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-white/50">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
              {user?.fullName}
            </h1>
            <p className="mt-1 text-sm text-white/60">
              {user?.designation}
              {user?.department ? ` · ${user.department}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/documents/new"
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
              New document
            </Link>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-lg border border-white/20 px-3.5 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 disabled:opacity-60"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {isExporting ? "Exporting…" : "Master list"}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-lg border border-danger/25 bg-danger-tint px-4 py-3 text-sm text-[#9c332f]">
          {error}
        </div>
      )}

      <LifecyclePipeline counts={stageCounts} />

      {/* Worklists */}
      <section>
        <h2 className="mb-3 font-display text-sm font-semibold text-text-primary">
          Needs attention
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {worklists.map(({ label, count, to, icon: Icon, description, personal }) => {
            const urgent = (count ?? 0) > 0;

            return (
              <Link
                key={to}
                to={to}
                className={`group rounded-xl border p-4 transition-colors hover:border-brand/40 ${
                  urgent
                    ? personal
                      ? "border-brand/40 bg-brand-tint/40"
                      : "border-stage-review/40 bg-stage-review/5"
                    : "border-border bg-surface-raised"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon
                    className={`h-5 w-5 ${
                      urgent ? (personal ? "text-brand" : "text-stage-review") : "text-text-tertiary"
                    }`}
                    aria-hidden="true"
                  />
                  <span
                    className={`font-display text-2xl font-semibold ${
                      urgent ? (personal ? "text-brand" : "text-stage-review") : "text-text-primary"
                    }`}
                  >
                    {count === null ? "—" : count}
                  </span>
                </div>
                <h3 className="mt-2 font-display text-sm font-semibold text-text-primary">{label}</h3>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">{description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent activity, straight from the audit trail — the same rows an inspector would
            read, not a separate "activity" concept that could drift from it. */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
              <ScrollText className="h-4 w-4" aria-hidden="true" />
              Recent activity
            </h2>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
            {activity.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-text-tertiary">
                Nothing recorded yet.
              </p>
            ) : (
              <ul>
                {activity.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-0"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-brand/60" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary">
                        <span className="font-medium">{humanizeAction(event.action)}</span>
                        {event.entityLabel && (
                          <span className="text-text-secondary"> · {event.entityLabel}</span>
                        )}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-text-tertiary">
                        {event.actor} · {formatDateTime(event.occurredAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Workflow entry points. Every flow in the system starts from one of these, which is
            the answer to "where do I go to do X" without hunting the sidebar. */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
            <Settings2 className="h-4 w-4" aria-hidden="true" />
            Start a workflow
          </h2>

          <div className="space-y-2">
            {[
              { to: "/documents/new", label: "Author a document", hint: "Draft from a template" },
              { to: "/my-signatures", label: "Review & sign", hint: "Your signing queue" },
              { to: "/documents", label: "Issue a controlled copy", hint: "From an effective document" },
              { to: "/reports/review-due", label: "Periodic review", hint: "Documents falling due" },
              { to: "/admin/organisation", label: "Configure the system", hint: "Sites, types, templates" },
            ].map(({ to, label, hint }) => (
              <Link
                key={label}
                to={to}
                className="group flex items-center justify-between rounded-lg border border-border bg-surface-raised px-3.5 py-3 transition-colors hover:border-brand/40 hover:bg-surface"
              >
                <span>
                  <span className="block text-sm font-medium text-text-primary">{label}</span>
                  <span className="block text-xs text-text-tertiary">{hint}</span>
                </span>
                <ArrowRight
                  className="h-4 w-4 flex-none text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
