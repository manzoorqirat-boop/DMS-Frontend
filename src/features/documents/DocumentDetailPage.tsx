import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileClock,
  GitBranch,
  Eye,
  History,
  Loader2,
  PenLine,
  ScrollText,
} from "lucide-react";
import { getDocument, listRevisions, reviseDocument, withdrawDocument } from "@/api/documents";
import { listAuditEvents } from "@/api/audit";
import { getRoute, getRouteTemplate, makeEffective, signDocument, submitForReview } from "@/api/review";
import { ApiError } from "@/lib/api-client";
import { formatDateOnly, formatDateTime, humanizeAction } from "@/lib/format";
import { useOrganisationData } from "@/features/organisation/useOrganisationData";
import { useAuth } from "@/features/auth/useAuth";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { PaginationBar } from "@/components/PaginationBar";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { DesktopEditButton } from "@/features/documents/DesktopEditButton";
import { DocumentCopiesSection } from "@/features/documents/DocumentCopiesSection";
import { DocumentLifecycleSection } from "@/features/documents/DocumentLifecycleSection";
import type { DocumentSummary } from "@/types/documents";
import type { AuditEventView } from "@/types/audit";
import type { PagedResult } from "@/types/paging";
import type { RouteTemplateView, RouteView, SignatureMeaning } from "@/types/review";

const AUDIT_PAGE_SIZE = 10;
const inputClasses =
  "w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[9px] text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand-tint";

function ActionErrorBanner({ message }: { message: string }) {
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

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSiteName, getDepartmentName, getDocumentTypeLabel } = useOrganisationData();
  const { user } = useAuth();

  const [document, setDocument] = useState<DocumentSummary | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(true);
  const [documentError, setDocumentError] = useState<string | null>(null);

  const [revisions, setRevisions] = useState<DocumentSummary[]>([]);
  const [isLoadingRevisions, setIsLoadingRevisions] = useState(true);

  const [route, setRoute] = useState<RouteView | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);

  const [auditPage, setAuditPage] = useState(1);
  const [auditResult, setAuditResult] = useState<PagedResult<AuditEventView> | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(true);

  // Shared by every action panel below — only one is ever open at a time, so one error slot is enough.
  const [actionError, setActionError] = useState<string | null>(null);

  // Submit for review
  const [showSubmitPanel, setShowSubmitPanel] = useState(false);
  const [routeTemplate, setRouteTemplate] = useState<RouteTemplateView | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [nominations, setNominations] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sign
  const [signingStepOrder, setSigningStepOrder] = useState<number | null>(null);
  const [signMeaning, setSignMeaning] = useState<SignatureMeaning>("Approved");
  const [signPassword, setSignPassword] = useState("");
  const [signReason, setSignReason] = useState("");
  const [isSigning, setIsSigning] = useState(false);

  // Make effective
  const [showEffectivePanel, setShowEffectivePanel] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isIssuing, setIsIssuing] = useState(false);

  // Withdraw / revise
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showRevisePanel, setShowRevisePanel] = useState(false);
  const [reviseReason, setReviseReason] = useState("");
  const [isRevising, setIsRevising] = useState(false);

  function loadDocument() {
    if (!id) return;
    setIsLoadingDocument(true);
    setDocumentError(null);
    getDocument(id)
      .then(setDocument)
      .catch((err: unknown) => {
        setDocumentError(err instanceof ApiError ? err.message : "Could not load this document.");
      })
      .finally(() => setIsLoadingDocument(false));
  }

  function loadRoute() {
    if (!id) return;
    setIsLoadingRoute(true);
    getRoute(id)
      .then(setRoute)
      .catch(() => setRoute(null))
      .finally(() => setIsLoadingRoute(false));
  }

  useEffect(loadDocument, [id]);
  useEffect(loadRoute, [id]);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setIsLoadingRevisions(true);
    listRevisions(id, controller.signal)
      .then(setRevisions)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setRevisions([]);
      })
      .finally(() => setIsLoadingRevisions(false));
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setIsLoadingAudit(true);
    listAuditEvents({ entityId: id, page: auditPage, pageSize: AUDIT_PAGE_SIZE }, controller.signal)
      .then(setAuditResult)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setAuditResult(null);
      })
      .finally(() => setIsLoadingAudit(false));
    return () => controller.abort();
  }, [id, auditPage]);

  function refreshAfterAction() {
    loadDocument();
    loadRoute();
  }

  async function openSubmitPanel() {
    if (!id) return;
    setActionError(null);
    setShowSubmitPanel(true);
    setIsLoadingTemplate(true);
    try {
      const template = await getRouteTemplate(id);
      setRouteTemplate(template);
      const defaults: Record<number, string> = {};
      for (const slot of template.slots) {
        if (slot.candidates.length === 1) {
          defaults[slot.stepOrder] = slot.candidates[0].userName;
        }
      }
      setNominations(defaults);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not load the review route for this document type.");
      setShowSubmitPanel(false);
    } finally {
      setIsLoadingTemplate(false);
    }
  }

  async function handleSubmitForReview() {
    if (!id || !routeTemplate) return;
    setActionError(null);

    const missing = routeTemplate.slots.filter((s) => !nominations[s.stepOrder]);
    if (missing.length > 0) {
      setActionError(`Nominate a signatory for step(s): ${missing.map((s) => s.stepLabel).join(", ")}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitForReview(id, {
        nominations: routeTemplate.slots.map((s) => ({ stepOrder: s.stepOrder, userName: nominations[s.stepOrder] })),
      });
      setShowSubmitPanel(false);
      setRouteTemplate(null);
      setNominations({});
      refreshAfterAction();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not submit for review.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openSignPanel(stepOrder: number, role: "Reviewer" | "Approver") {
    setActionError(null);
    setSigningStepOrder(stepOrder);
    setSignMeaning(role === "Approver" ? "Approved" : "Reviewed");
    setSignPassword("");
    setSignReason("");
  }

  async function handleSign() {
    if (!id || signingStepOrder === null) return;
    setActionError(null);

    if (!signPassword) {
      setActionError("Re-enter your password to sign.");
      return;
    }
    if (signMeaning === "Rejected" && !signReason.trim()) {
      setActionError("A reason is required when rejecting a document.");
      return;
    }

    setIsSigning(true);
    try {
      await signDocument(id, {
        password: signPassword,
        meaning: signMeaning,
        reason: signMeaning === "Rejected" ? signReason.trim() : undefined,
      });
      setSigningStepOrder(null);
      setSignPassword("");
      setSignReason("");
      refreshAfterAction();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not record the signature.");
    } finally {
      setIsSigning(false);
    }
  }

  async function handleMakeEffective() {
    if (!id) return;
    setActionError(null);
    if (!effectiveDate) {
      setActionError("Choose an effective date.");
      return;
    }
    setIsIssuing(true);
    try {
      await makeEffective(id, effectiveDate);
      setShowEffectivePanel(false);
      refreshAfterAction();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not make this document effective.");
    } finally {
      setIsIssuing(false);
    }
  }

  async function handleWithdraw() {
    if (!id) return;
    if (!window.confirm("Withdraw this draft? The document number stays burned and is not reused.")) {
      return;
    }
    setActionError(null);
    setIsWithdrawing(true);
    try {
      await withdrawDocument(id);
      refreshAfterAction();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not withdraw this document.");
    } finally {
      setIsWithdrawing(false);
    }
  }

  async function handleRevise() {
    if (!id) return;
    setActionError(null);
    if (!reviseReason.trim()) {
      setActionError("A reason is required to start a revision.");
      return;
    }
    setIsRevising(true);
    try {
      const created = await reviseDocument(id, { reason: reviseReason.trim() });
      navigate(`/documents/${created.id}`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not start a revision.");
      setIsRevising(false);
    }
  }

  if (!id) {
    return null;
  }

  if (documentError) {
    return (
      <div>
        <BackLink />
        <EmptyState
          icon={FileClock}
          title="Document not found"
          description={documentError}
          action={{ label: "Back to documents", onClick: () => navigate("/documents") }}
        />
      </div>
    );
  }

  if (isLoadingDocument || !document) {
    return (
      <div>
        <BackLink />
        <div className="h-8 w-64 animate-pulse rounded bg-text-tertiary/10" />
        <div className="mt-3 h-4 w-96 animate-pulse rounded bg-text-tertiary/10" />
      </div>
    );
  }

  const currentRevision = revisions.find((r) => r.isCurrentRevision);
  const isViewingSuperseded = !document.isCurrentRevision && currentRevision;

  const pendingSteps = (route?.steps ?? []).filter((s) => s.status === "Pending").sort((a, b) => a.stepOrder - b.stepOrder);
  const currentStep = pendingSteps[0];
  const canSignCurrentStep =
    document.status === "InReview" && currentStep && user?.userName === currentStep.userName;

  // Mirrors ControlledDocument.IsEditable, which the backend enforces regardless.
  const canEdit = document.status === "Draft";
  const canSubmit = document.status === "Draft";
  const canWithdraw = document.status === "Draft";
  const canMakeEffective = document.status === "Approved";
  const canRevise = document.isCurrentRevision && (document.status === "Effective" || document.status === "Obsolete");

  const revisionColumns: DataTableColumn<DocumentSummary>[] = [
    { key: "revision", header: "Rev", className: "font-mono", render: (r) => r.revisionLabel },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "effective", header: "Effective", className: "font-mono text-xs", render: (r) => formatDateOnly(r.effectiveDate) },
    { key: "created", header: "Created", className: "font-mono text-xs", render: (r) => formatDateTime(r.createdAt) },
  ];

  const auditColumns: DataTableColumn<AuditEventView>[] = [
    { key: "occurredAt", header: "When", className: "font-mono text-xs whitespace-nowrap", render: (e) => formatDateTime(e.occurredAt) },
    { key: "actor", header: "Actor", render: (e) => e.actor },
    { key: "action", header: "Action", render: (e) => humanizeAction(e.action) },
    { key: "details", header: "Details", render: (e) => <span className="text-text-secondary">{e.details ?? "—"}</span> },
  ];

  return (
    <div className="max-w-4xl">
      <BackLink />

      {isViewingSuperseded && currentRevision && (
        <div className="mb-5 rounded-lg border border-stage-superseded/30 bg-stage-superseded/10 px-4 py-2.5 text-sm text-ink-900">
          You're viewing Rev {document.revisionLabel}, which is {document.status.toLowerCase()}.{" "}
          <Link to={`/documents/${currentRevision.id}`} className="font-medium text-brand hover:underline">
            Go to Rev {currentRevision.revisionLabel}, the version in force →
          </Link>
        </div>
      )}

      <div className="mb-1 flex items-center gap-3">
        <h1 className="font-mono text-xl font-semibold text-text-primary">{document.documentNumber}</h1>
        <StatusBadge status={document.status} />
      </div>
      <p className="mb-4 text-lg text-text-primary">{document.title}</p>

      <p className="mb-6 text-sm text-text-secondary">
        {getSiteName(document.siteId)} · {getDepartmentName(document.departmentId)} ·{" "}
        {getDocumentTypeLabel(document.documentTypeId)} · Authored by {document.author}
      </p>

      {/* Lifecycle actions */}
      {actionError && <ActionErrorBanner message={actionError} />}

      <div className="mb-8 flex flex-wrap gap-2.5">
        {/* Viewing is offered at every status and to anyone who can see the document — a
            reviewer or approver has to be able to read what they are about to sign, and they
            are looking at documents that are deliberately no longer editable. */}
        <button
          type="button"
          onClick={() => navigate(`/documents/${document.id}/view`)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          View document
        </button>
        {/* Editing is only offered for a Draft, matching EditingService's own guard: a
            document in review is frozen against the hash its signatures are applied to.
            The button always shows for a Draft even when no document server is configured —
            the editor page explains that case far better than a hidden button does. */}
        {/* Desktop Word. Offered alongside the browser editor rather than instead of it: this
            path downloads the controlled file to the user's machine, so it should be a
            deliberate choice rather than the default. See DesktopEditButton. */}
        {canEdit && <DesktopEditButton documentId={document.id} />}
        {canEdit && (
          <button
            type="button"
            onClick={() => navigate(`/documents/${document.id}/edit`)}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            <PenLine className="h-4 w-4" aria-hidden="true" />
            Edit document
          </button>
        )}
        {canSubmit && !showSubmitPanel && (
          <button type="button" onClick={openSubmitPanel} className="rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover">
            Submit for review
          </button>
        )}
        {canWithdraw && (
          <button
            type="button"
            disabled={isWithdrawing}
            onClick={handleWithdraw}
            className="rounded-lg border border-danger/30 px-3.5 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger-tint disabled:opacity-60"
          >
            {isWithdrawing ? "Withdrawing…" : "Withdraw"}
          </button>
        )}
        {canMakeEffective && !showEffectivePanel && (
          <button type="button" onClick={() => setShowEffectivePanel(true)} className="rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover">
            Make effective
          </button>
        )}
        {canRevise && !showRevisePanel && (
          <button type="button" onClick={() => setShowRevisePanel(true)} className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text-primary">
            Start revision
          </button>
        )}
      </div>

      {/* Submit for review panel */}
      {showSubmitPanel && (
        <div className="mb-8 rounded-xl border border-border bg-surface-raised p-4">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">Nominate signatories</h3>
          {isLoadingTemplate ? (
            <div className="h-16 animate-pulse rounded bg-text-tertiary/10" />
          ) : routeTemplate ? (
            <>
              <p className="mb-3 text-xs text-text-secondary">
                Route: {routeTemplate.workflowName} (v{routeTemplate.workflowVersion})
              </p>
              <div className="mb-4 space-y-3">
                {routeTemplate.slots.map((slot) => (
                  <div key={slot.stepOrder} className="flex flex-wrap items-center gap-3">
                    <span className="w-56 text-sm text-text-primary">
                      {slot.stepOrder}. {slot.stepLabel} <span className="text-text-tertiary">({slot.role})</span>
                    </span>
                    {slot.candidates.length === 0 ? (
                      <span className="text-xs text-danger">No eligible signer for this step — assign {slot.roleCode} to someone here first.</span>
                    ) : (
                      <select
                        value={nominations[slot.stepOrder] ?? ""}
                        onChange={(e) => setNominations((prev) => ({ ...prev, [slot.stepOrder]: e.target.value }))}
                        className={`${inputClasses} max-w-xs`}
                      >
                        <option value="">Select…</option>
                        {slot.candidates.map((c) => (
                          <option key={c.userId} value={c.userName}>{c.fullName} ({c.userName})</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitForReview}
                  className="flex items-center gap-1.5 rounded-[9px] bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Submit
                </button>
                <button type="button" onClick={() => setShowSubmitPanel(false)} className="rounded-[9px] px-3.5 py-2 text-sm font-medium text-text-secondary hover:text-text-primary">
                  Cancel
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Make effective panel */}
      {showEffectivePanel && (
        <div className="mb-8 rounded-xl border border-border bg-surface-raised p-4">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">Make effective</h3>
          <div className="mb-4 flex items-end gap-3">
            <div>
              <label htmlFor="effectiveDate" className="mb-[6px] block text-xs font-semibold text-text-primary">Effective date</label>
              <input id="effectiveDate" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={inputClasses} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isIssuing}
              onClick={handleMakeEffective}
              className="flex items-center gap-1.5 rounded-[9px] bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isIssuing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Confirm
            </button>
            <button type="button" onClick={() => setShowEffectivePanel(false)} className="rounded-[9px] px-3.5 py-2 text-sm font-medium text-text-secondary hover:text-text-primary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Revise panel */}
      {showRevisePanel && (
        <div className="mb-8 rounded-xl border border-border bg-surface-raised p-4">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">Start a revision</h3>
          <div className="mb-4">
            <label htmlFor="reviseReason" className="mb-[6px] block text-xs font-semibold text-text-primary">Reason</label>
            <input id="reviseReason" value={reviseReason} onChange={(e) => setReviseReason(e.target.value)} placeholder="Why this revision is needed" className={inputClasses} />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isRevising}
              onClick={handleRevise}
              className="flex items-center gap-1.5 rounded-[9px] bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isRevising && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Start revision
            </button>
            <button type="button" onClick={() => setShowRevisePanel(false)} className="rounded-[9px] px-3.5 py-2 text-sm font-medium text-text-secondary hover:text-text-primary">
              Cancel
            </button>
          </div>
        </div>
      )}

      <dl className="mb-10 grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Fact label="Revision" value={document.revisionLabel} mono />
        <Fact label="Created" value={formatDateTime(document.createdAt)} />
        <Fact label="Effective" value={formatDateOnly(document.effectiveDate)} mono />
        <Fact label="Next review" value={formatDateOnly(document.nextReviewDate)} mono />
        {document.retainUntil && <Fact label="Retain until" value={formatDateOnly(document.retainUntil)} mono />}
        {document.disposition && <Fact label="Disposition" value={document.disposition} />}
        {document.obsoleteReason && (
          <div className="col-span-2 sm:col-span-4">
            <Fact label="Obsolete reason" value={document.obsoleteReason} />
          </div>
        )}
      </dl>

      {/* Review route */}
      {!isLoadingRoute && route && route.steps.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
            <GitBranch className="h-4 w-4" aria-hidden="true" />
            Review route
          </h2>
          <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
            {route.steps
              .slice()
              .sort((a, b) => a.stepOrder - b.stepOrder)
              .map((step, index) => (
                <div key={step.stepOrder} className={`px-4 py-3.5 ${index > 0 ? "border-t border-border" : ""}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-text-primary">
                      {step.stepOrder}. {step.stepLabel} <span className="text-text-tertiary">({step.role})</span> —{" "}
                      <span className="font-mono">{step.userName}</span>
                    </span>
                    <StepStatusBadge status={step.status} />
                  </div>
                  {step.signature && (
                    <p className="mt-1.5 text-xs text-text-secondary">
                      {step.signature.meaning} by {step.signature.fullName} ({step.signature.designation},{" "}
                      {step.signature.department}) at {formatDateTime(step.signature.signedAt)}
                      {step.signature.reason && <> — "{step.signature.reason}"</>}
                    </p>
                  )}
                  {canSignCurrentStep && currentStep?.stepOrder === step.stepOrder && signingStepOrder !== step.stepOrder && (
                    <button
                      type="button"
                      onClick={() => openSignPanel(step.stepOrder, step.role)}
                      className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-hover"
                    >
                      <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                      Sign this step
                    </button>
                  )}
                  {signingStepOrder === step.stepOrder && (
                    <div className="mt-3 rounded-lg border border-border bg-surface p-3.5">
                      <div className="mb-3 flex flex-wrap gap-3">
                        <div>
                          <label className="mb-[6px] block text-xs font-semibold text-text-primary">Meaning</label>
                          <select
                            value={signMeaning}
                            onChange={(e) => setSignMeaning(e.target.value as SignatureMeaning)}
                            className={inputClasses}
                          >
                            <option value={step.role === "Approver" ? "Approved" : "Reviewed"}>
                              {step.role === "Approver" ? "Approved" : "Reviewed"}
                            </option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <label className="mb-[6px] block text-xs font-semibold text-text-primary">Password</label>
                          <input
                            type="password"
                            value={signPassword}
                            onChange={(e) => setSignPassword(e.target.value)}
                            className={inputClasses}
                          />
                        </div>
                      </div>
                      {signMeaning === "Rejected" && (
                        <div className="mb-3">
                          <label className="mb-[6px] block text-xs font-semibold text-text-primary">Reason</label>
                          <input value={signReason} onChange={(e) => setSignReason(e.target.value)} className={inputClasses} />
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={isSigning}
                          onClick={handleSign}
                          className="flex items-center gap-1.5 rounded-[9px] bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSigning && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                          Sign
                        </button>
                        <button type="button" onClick={() => setSigningStepOrder(null)} className="rounded-[9px] px-3.5 py-2 text-sm font-medium text-text-secondary hover:text-text-primary">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Lifecycle and distribution both apply only once a document is in force, and each
          renders nothing otherwise — so they sit above the historical sections rather than
          being conditionally wrapped here. */}
      <DocumentLifecycleSection document={document} onChanged={setDocument} />

      {document.status === "Effective" && (
        <DocumentCopiesSection documentId={document.id} canDistribute />
      )}

      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
          <History className="h-4 w-4" aria-hidden="true" />
          Revision history
        </h2>
        <DataTable
          columns={revisionColumns}
          rows={revisions}
          getRowKey={(r) => r.id}
          isLoading={isLoadingRevisions}
          skeletonRowCount={3}
          onRowClick={(r) => (r.id !== document.id ? navigate(`/documents/${r.id}`) : undefined)}
          emptyState={<EmptyState icon={History} title="No revision history" description="This is the only revision on record." />}
        />
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
          <ScrollText className="h-4 w-4" aria-hidden="true" />
          Audit trail
        </h2>
        <DataTable
          columns={auditColumns}
          rows={auditResult?.items ?? []}
          getRowKey={(e) => e.id}
          isLoading={isLoadingAudit}
          skeletonRowCount={AUDIT_PAGE_SIZE}
          emptyState={<EmptyState icon={ScrollText} title="No audit events" description="Nothing has been recorded for this document yet." />}
        />
        {!isLoadingAudit && <PaginationBar result={auditResult} onPageChange={setAuditPage} />}
      </section>
    </div>
  );
}

function StepStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Pending: "bg-text-tertiary/10 text-text-secondary",
    Signed: "bg-brand-tint text-brand",
    Rejected: "bg-danger-tint text-[#9c332f]",
    Cancelled: "bg-text-tertiary/10 text-text-tertiary",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? map.Pending}`}>
      {status === "Signed" && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
      {status}
    </span>
  );
}

function BackLink() {
  return (
    <Link to="/documents" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to documents
    </Link>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-text-tertiary">{label}</dt>
      <dd className={`mt-1 text-sm text-text-primary ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
