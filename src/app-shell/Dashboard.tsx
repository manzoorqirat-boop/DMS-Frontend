import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, Download, PackageCheck, PenLine } from "lucide-react";
import { listReviewDue, listDispositionDue } from "@/api/lifecycle";
import { listPendingRetrieval } from "@/api/distribution";
import { getMyPendingSignatures } from "@/api/review";
import { exportMasterList, downloadBlob } from "@/api/exports";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/features/auth/useAuth";
import { PageHeader } from "@/components/PageHeader";

interface Worklist {
  label: string;
  count: number | null;
  to: string;
  icon: typeof PenLine;
  /** Amber when there's something to act on, neutral when clear. */
  urgent: boolean;
  description: string;
}

/**
 * The landing screen: what is waiting on the person signed in, and what is waiting on the
 * organisation.
 *
 * Deliberately built from the same worklist endpoints the dedicated screens use, rather than a
 * bespoke "dashboard summary" API. That means the numbers here can never disagree with the
 * screens they link to — a dashboard that contradicts the page it points at is worse than no
 * dashboard.
 */
export function Dashboard() {
  const { user } = useAuth();

  const [mySignatures, setMySignatures] = useState<number | null>(null);
  const [reviewsDue, setReviewsDue] = useState<number | null>(null);
  const [copiesOut, setCopiesOut] = useState<number | null>(null);
  const [dispositions, setDispositions] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    // pageSize=1 everywhere: only totalCount is needed, so there's no reason to transfer rows
    // this screen will never render.
    // No AbortSignal on this one — getMyPendingSignatures doesn't accept one, so the guard
    // is a cancelled flag instead. Setting state after unmount is harmless in React 18 but
    // still worth not doing.
    let cancelled = false;
    getMyPendingSignatures()
      .then((items) => {
        if (!cancelled) setMySignatures(items.length);
      })
      .catch(() => {
        if (!cancelled) setMySignatures(null);
      });

    listReviewDue({ withinDays: 90, page: 1, pageSize: 1 }, controller.signal)
      .then((r) => setReviewsDue(r.totalCount))
      .catch(() => setReviewsDue(null));

    listPendingRetrieval({ page: 1, pageSize: 1 }, controller.signal)
      .then((r) => setCopiesOut(r.totalCount))
      .catch(() => setCopiesOut(null));

    listDispositionDue({ page: 1, pageSize: 1 }, controller.signal)
      .then((r) => setDispositions(r.totalCount))
      .catch(() => setDispositions(null));

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
      urgent: (mySignatures ?? 0) > 0,
      description: "Steps you can act on right now, not ones queued behind someone else.",
    },
    {
      label: "Reviews due",
      count: reviewsDue,
      to: "/reports/review-due",
      icon: CalendarClock,
      urgent: (reviewsDue ?? 0) > 0,
      description: "Documents approaching or past their periodic review date.",
    },
    {
      label: "Copies to retrieve",
      count: copiesOut,
      to: "/reports/pending-retrieval",
      icon: PackageCheck,
      urgent: (copiesOut ?? 0) > 0,
      description: "Controlled copies still held for superseded or obsolete documents.",
    },
    {
      label: "Awaiting disposition",
      count: dispositions,
      to: "/reports/disposition-due",
      icon: AlertTriangle,
      urgent: (dispositions ?? 0) > 0,
      description: "Records past their retention period with no decision recorded.",
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.fullName ?? ""}`}
        description={`${user?.designation ?? ""}${user?.department ? ` · ${user.department}` : ""}`}
        actions={
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface disabled:opacity-60"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {isExporting ? "Exporting…" : "Export master list"}
          </button>
        }
      />

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-danger/25 bg-danger-tint px-4 py-3 text-sm text-[#9c332f]">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {worklists.map(({ label, count, to, icon: Icon, urgent, description }) => (
          <Link
            key={to}
            to={to}
            className={`rounded-xl border p-4 transition-colors hover:border-brand/40 ${
              urgent ? "border-stage-review/40 bg-stage-review/5" : "border-border bg-surface-raised"
            }`}
          >
            <div className="flex items-center justify-between">
              <Icon
                className={`h-5 w-5 ${urgent ? "text-stage-review" : "text-text-tertiary"}`}
                aria-hidden="true"
              />
              <span
                className={`font-display text-2xl font-semibold ${
                  urgent ? "text-stage-review" : "text-text-primary"
                }`}
              >
                {count === null ? "—" : count}
              </span>
            </div>
            <h2 className="mt-2 font-display text-sm font-semibold text-text-primary">{label}</h2>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">{description}</p>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-xs text-text-tertiary">
        A dash means that worklist couldn't be loaded — usually a permission you don't hold,
        rather than an error worth chasing.
      </p>
    </div>
  );
}
