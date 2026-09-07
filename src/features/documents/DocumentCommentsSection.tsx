import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Loader2, MessageSquare, RotateCcw, X } from "lucide-react";
import {
  addComment,
  listComments,
  reopenComment,
  respondToComment,
  withdrawComment,
} from "@/api/collaboration";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/features/auth/useAuth";
import { EmptyState } from "@/components/EmptyState";
import type { CommentSeverity, ReviewCommentView } from "@/types/collaboration";
import type { DocumentSummary } from "@/types/documents";

const inputClasses =
  "w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[9px] text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand-tint";

/**
 * Review comments and the loop that resolves them.
 *
 * The value isn't the comment, it's the cycle: raise, revise, respond, resolve. A rejection
 * carrying one free-text reason tells an author something is wrong but not where, and leaves no
 * record of whether each point was ever addressed.
 *
 * Blocking comments stop resubmission; advisory ones don't. That distinction is shown
 * prominently because it's the one thing an author needs at a glance — which of these must I
 * deal with before I can submit.
 */
export function DocumentCommentsSection({ document }: { document: DocumentSummary }) {
  const { user } = useAuth();

  const [comments, setComments] = useState<ReviewCommentView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    sectionReference: "",
    quotedText: "",
    body: "",
    severity: "Blocking" as CommentSeverity,
  });
  const [isSaving, setIsSaving] = useState(false);

  const [respondingTo, setRespondingTo] = useState<ReviewCommentView | null>(null);
  const [response, setResponse] = useState("");

  // Raising a comment on an effective document would be a change request, not a review
  // comment — the backend refuses it, so the button is hidden rather than left to fail.
  const canComment = ["Draft", "InDraftReview", "InReview"].includes(document.status);
  const openBlocking = comments.filter((c) => c.blocksResubmission).length;

  function refresh() {
    setIsLoading(true);
    listComments(document.id)
      .then(setComments)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Could not load comments."),
      )
      .finally(() => setIsLoading(false));
  }

  useEffect(refresh, [document.id]);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!form.sectionReference.trim() || !form.body.trim()) {
      setError("A section reference and a comment are both required.");
      return;
    }

    setIsSaving(true);
    try {
      await addComment(document.id, {
        sectionReference: form.sectionReference.trim(),
        quotedText: form.quotedText.trim() || null,
        body: form.body.trim(),
        severity: form.severity,
      });
      setForm({ sectionReference: "", quotedText: "", body: "", severity: "Blocking" });
      setShowForm(false);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save that comment.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRespond(accept: boolean) {
    if (!respondingTo || !response.trim()) {
      setError("Say what you did about it — a response is required.");
      return;
    }

    setBusyId(respondingTo.id);
    try {
      await respondToComment(respondingTo.id, { accept, response: response.trim() });
      setRespondingTo(null);
      setResponse("");
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save that response.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReviewerAction(comment: ReviewCommentView, reopen: boolean) {
    setBusyId(comment.id);
    setError(null);
    try {
      await (reopen ? reopenComment(comment.id) : withdrawComment(comment.id));
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That action was refused.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mb-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Review comments
          {openBlocking > 0 && (
            <span className="rounded-full bg-danger-tint px-2 py-0.5 text-[11px] font-medium text-[#9c332f]">
              {openBlocking} blocking
            </span>
          )}
        </h2>

        {canComment && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface"
          >
            Add a comment
          </button>
        )}
      </div>

      {openBlocking > 0 && (
        <p className="mb-3 rounded-[9px] border border-danger/25 bg-danger-tint px-3.5 py-2.5 text-[13px] leading-relaxed text-[#9c332f]">
          This document cannot be submitted while {openBlocking} blocking comment
          {openBlocking === 1 ? " is" : "s are"} unanswered. Resolve or decline each one —
          declining with a reason is a legitimate answer.
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2.5 rounded-[9px] border border-danger/25 bg-danger-tint px-3.5 py-2.5 text-[13px] text-[#9c332f]"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-text-tertiary/10" />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-raised">
          <EmptyState
            icon={MessageSquare}
            title="No comments"
            description={
              canComment
                ? "Reviewers can raise comments against a section of this document."
                : "Comments are raised while a document is being drafted or reviewed."
            }
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => {
            const isMine = c.raisedBy === user?.userName;
            const answered = c.status === "Resolved" || c.status === "Declined";

            return (
              <li
                key={c.id}
                className={`rounded-xl border p-4 ${
                  c.blocksResubmission
                    ? "border-danger/30 bg-danger-tint/30"
                    : c.status === "Open"
                      ? "border-stage-review/30 bg-stage-review/5"
                      : "border-border bg-surface-raised"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[13px] font-semibold text-text-primary">
                        {c.sectionReference}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          c.severity === "Blocking"
                            ? "bg-danger-tint text-[#9c332f]"
                            : "bg-text-tertiary/10 text-text-secondary"
                        }`}
                      >
                        {c.severity}
                      </span>
                      <span className="text-[11px] text-text-tertiary">{c.status}</span>
                    </div>

                    {c.quotedText && (
                      <blockquote className="mt-2 border-l-2 border-border pl-3 text-[13px] italic text-text-secondary">
                        {c.quotedText}
                      </blockquote>
                    )}

                    <p className="mt-2 text-sm leading-relaxed text-text-primary">{c.body}</p>
                    <p className="mt-1 font-mono text-[11px] text-text-tertiary">
                      {c.raisedBy} · {formatDateTime(c.raisedAt)}
                    </p>

                    {c.response && (
                      <div className="mt-3 rounded-lg border border-border bg-surface p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                          {c.status === "Declined" ? "Declined" : "Resolved"} by {c.respondedBy}
                        </p>
                        <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                          {c.response}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-none flex-col items-end gap-1.5">
                    {busyId === c.id && (
                      <Loader2
                        className="h-4 w-4 animate-spin text-text-tertiary"
                        aria-hidden="true"
                      />
                    )}

                    {c.status === "Open" && (
                      <button
                        type="button"
                        onClick={() => {
                          setRespondingTo(c);
                          setResponse("");
                        }}
                        className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface"
                      >
                        Respond
                      </button>
                    )}

                    {/* Withdraw and reopen belong to whoever raised the comment — the backend
                        refuses anyone else, so showing them to others would only produce
                        errors. */}
                    {isMine && c.status === "Open" && (
                      <button
                        type="button"
                        onClick={() => handleReviewerAction(c, false)}
                        className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                        Withdraw
                      </button>
                    )}

                    {isMine && answered && (
                      <button
                        type="button"
                        onClick={() => handleReviewerAction(c, true)}
                        className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface"
                      >
                        <RotateCcw className="h-3 w-3" aria-hidden="true" />
                        Reopen
                      </button>
                    )}
                  </div>
                </div>

                {respondingTo?.id === c.id && (
                  <div className="mt-3 border-t border-border pt-3">
                    <label className="block text-xs font-semibold text-text-primary">
                      Your response
                      <textarea
                        rows={2}
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        placeholder="What you changed, or why you disagree"
                        className={`mt-1 ${inputClasses}`}
                      />
                    </label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleRespond(true)}
                        className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-hover"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Resolved — I made the change
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespond(false)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface"
                      >
                        Decline — I disagree
                      </button>
                      <button
                        type="button"
                        onClick={() => setRespondingTo(null)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-tertiary transition-colors hover:bg-surface"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="mt-4 rounded-xl border border-border bg-surface-raised p-4"
        >
          <h3 className="mb-3 font-display text-sm font-semibold text-text-primary">
            Raise a comment
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-text-primary">
              Section
              <input
                value={form.sectionReference}
                onChange={(e) => setForm({ ...form, sectionReference: e.target.value })}
                placeholder="6.3"
                className={`mt-1 font-mono ${inputClasses}`}
              />
            </label>

            <label className="text-xs font-semibold text-text-primary">
              Severity
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value as CommentSeverity })}
                className={`mt-1 ${inputClasses}`}
              >
                <option value="Blocking">Blocking — must be answered</option>
                <option value="Advisory">Advisory — a suggestion</option>
              </select>
            </label>

            <label className="text-xs font-semibold text-text-primary sm:col-span-2">
              The text you're commenting on (optional)
              <input
                value={form.quotedText}
                onChange={(e) => setForm({ ...form, quotedText: e.target.value })}
                placeholder="Paste the sentence — it survives the paragraph being rewritten"
                className={`mt-1 ${inputClasses}`}
              />
            </label>

            <label className="text-xs font-semibold text-text-primary sm:col-span-2">
              Comment
              <textarea
                rows={3}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
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
              Raise comment
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
    </section>
  );
}
