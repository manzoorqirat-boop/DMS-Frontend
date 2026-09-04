import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock } from "lucide-react";
import { countersign, listPendingActions } from "@/api/signingActions";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { SignatureDialog } from "@/components/SignatureDialog";
import { ACTION_LABELS, type PendingActionView } from "@/types/signing-actions";

type Decision = { action: PendingActionView; approve: boolean };

/**
 * The countersignature queue: actions someone has performed or requested that need a second
 * person's signature.
 *
 * The distinction this screen exists to make visible is `hasTakenEffect`. Half these rows are
 * things that already happened and need verifying; the other half are things waiting for
 * permission to happen at all. Refusing means something completely different in each case —
 * a recorded discrepancy versus the act simply not occurring — so the two are labelled
 * differently rather than left to the reader to infer.
 */
export function CountersignPage() {
  const navigate = useNavigate();

  const [actions, setActions] = useState<PendingActionView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [decision, setDecision] = useState<Decision | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    listPendingActions(controller.signal)
      .then(setActions)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.message : "Could not load the queue.");
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [refreshToken]);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Awaiting countersignature"
        description="Actions that need a second person to sign. You cannot countersign something you performed yourself."
      />

      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-[9px] border border-danger/25 bg-danger-tint px-3.5 py-2.5 text-[13px] text-[#9c332f]">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-text-tertiary/10" />
          ))}
        </div>
      )}

      {!isLoading && actions.length === 0 && (
        <div className="rounded-xl border border-border bg-surface-raised">
          <EmptyState
            icon={ClipboardCheck}
            title="Nothing waiting"
            description="Actions needing a second signature will appear here."
          />
        </div>
      )}

      {!isLoading && actions.length > 0 && (
        <ul className="space-y-3">
          {actions.map((a) => (
            <li
              key={a.id}
              className={`rounded-xl border p-4 ${
                a.hasTakenEffect
                  ? "border-stage-review/40 bg-stage-review/5"
                  : "border-border bg-surface-raised"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-sm font-semibold text-text-primary">
                      {ACTION_LABELS[a.action] ?? a.action}
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        a.hasTakenEffect
                          ? "bg-stage-review/15 text-stage-review"
                          : "bg-text-tertiary/10 text-text-secondary"
                      }`}
                    >
                      {a.hasTakenEffect ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          Already done — verify it
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          Not yet done — authorise it
                        </>
                      )}
                    </span>
                  </div>

                  <p className="mt-1 font-mono text-[13px] text-text-primary">{a.subjectLabel}</p>

                  <p className="mt-1 text-xs text-text-tertiary">
                    Performed by {a.performedByFullName} ({a.performedBy}) ·{" "}
                    {formatDateTime(a.performedAt)}
                    {a.countersignerPermission && ` · needs ${a.countersignerPermission}`}
                  </p>
                </div>

                <div className="flex flex-none gap-2">
                  <button
                    type="button"
                    onClick={() => setDecision({ action: a, approve: true })}
                    className="rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
                  >
                    {a.hasTakenEffect ? "Verify" : "Authorise"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision({ action: a, approve: false })}
                    className="rounded-lg border border-danger/30 px-3.5 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger-tint"
                  >
                    Refuse
                  </button>
                </div>
              </div>

              {a.subjectType === "ControlledDocument" && (
                <button
                  type="button"
                  onClick={() => navigate(`/documents/${a.subjectId}`)}
                  className="mt-2 text-xs font-medium text-brand hover:underline"
                >
                  Open the document →
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <SignatureDialog
        open={decision !== null}
        destructive={decision?.approve === false}
        title={
          decision === null
            ? ""
            : decision.approve
              ? decision.action.hasTakenEffect
                ? "Verify this action"
                : "Authorise this action"
              : "Refuse this action"
        }
        description={
          decision === null ? null : decision.approve ? (
            decision.action.hasTakenEffect ? (
              <>
                Confirming that <strong>{decision.action.subjectLabel}</strong> was performed
                correctly by {decision.action.performedByFullName}.
              </>
            ) : (
              <>
                Authorising <strong>{decision.action.subjectLabel}</strong>. It takes effect as
                soon as you sign.
              </>
            )
          ) : decision.action.hasTakenEffect ? (
            <>
              This action has already taken effect and refusing will not undo it. What your
              refusal records is a <strong>discrepancy</strong> for investigation — which is the
              honest outcome, and the right one if something is wrong.
            </>
          ) : (
            <>
              Refusing means <strong>{decision.action.subjectLabel}</strong> will not happen.
            </>
          )
        }
        meaning={
          decision === null
            ? ""
            : !decision.approve
              ? "I refuse this action"
              : decision.action.hasTakenEffect
                ? "I have verified this action was performed correctly"
                : "I authorise this action to be performed"
        }
        confirmLabel={decision?.approve ? "Sign" : "Refuse and sign"}
        reasonLabel={decision?.approve === false ? "Reason for refusing" : undefined}
        reasonPlaceholder="Why this is being refused"
        onCancel={() => setDecision(null)}
        onConfirm={async (password, reason) => {
          if (!decision) return;
          try {
            await countersign(decision.action.id, {
              password,
              approve: decision.approve,
              reason: reason || null,
            });
            setDecision(null);
            setRefreshToken((t) => t + 1);
          } catch (err) {
            throw new Error(
              err instanceof ApiError ? err.message : "That countersignature could not be applied.",
            );
          }
        }}
      />
    </div>
  );
}
