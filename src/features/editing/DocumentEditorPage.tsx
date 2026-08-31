import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Loader2, Lock } from "lucide-react";
import { releaseEditingSession, startEditingSession } from "@/api/editing";
import { loadOnlyOfficeApi, type OnlyOfficeEditorInstance } from "@/lib/onlyoffice";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { EditorLaunchView } from "@/types/editing";

const EDITOR_ELEMENT_ID = "dms-onlyoffice-editor";

/**
 * The in-browser editor.
 *
 * Exists because URS #13 forbids the working file ever landing on a client PC — there is no
 * download-edit-reupload path anywhere in this system, deliberately. The browser never
 * receives the .docx: it loads the editor UI from the document server, and the document
 * server fetches the file from DMS server-to-server using the signed, expiring URL in
 * EditorLaunchView.
 *
 * Opening this page takes a check-out on the document. Navigating away does NOT release it —
 * that has to be explicit, because a lock that evaporates on a stray back-button press is a
 * lock nobody can rely on. Abandoned sessions expire on their own (SessionMinutes) and the
 * next person takes them over.
 */
export function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [launch, setLaunch] = useState<EditorLaunchView | null>(null);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [showRelease, setShowRelease] = useState(false);

  const editorRef = useRef<OnlyOfficeEditorInstance | null>(null);

  // Check out the document and get the launch payload.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    setIsStarting(true);
    setError(null);

    startEditingSession(id)
      .then((view) => {
        if (!cancelled) setLaunch(view);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? { code: err.code, message: err.message }
            : { message: "Could not open the editor." },
        );
      })
      .finally(() => {
        if (!cancelled) setIsStarting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Mount the editor once the launch payload is in hand.
  useEffect(() => {
    if (!launch) return;
    let cancelled = false;

    loadOnlyOfficeApi(launch.documentServerUrl)
      .then(() => {
        if (cancelled || !window.DocsAPI) return;

        // The vendor payload is assembled HERE, from the API's neutral shape — see the note
        // on EditorLaunchView. Nothing OnlyOffice-specific belongs on the backend contract.
        editorRef.current = new window.DocsAPI.DocEditor(EDITOR_ELEMENT_ID, {
          documentType: "word",
          type: "desktop",
          width: "100%",
          height: "100%",
          document: {
            fileType: "docx",
            // Must change whenever the content changes, or the document server serves a
            // stale cached copy. The backend regenerates it per save for exactly this reason.
            key: launch.sessionKey,
            title: `${launch.documentNumber} — ${launch.title}`,
            url: launch.fileUrl,
            permissions: {
              edit: true,
              download: false,
              print: false,
              // Copy stays enabled: blocking it frustrates authors writing real procedures
              // and stops nobody determined, since the content is on screen regardless.
              review: false,
              // chat and comments belong here from OnlyOffice 7.x on — they were moved out
              // of editorConfig.customization, which now warns if they're still set there.
              // Both are off because this system records collaboration in its own audit
              // trail and signature route; a side channel inside the editor would be
              // discussion about a controlled document that no audit trail ever sees.
              chat: false,
              comment: false,
            },
          },
          editorConfig: {
            callbackUrl: launch.callbackUrl,
            lang: "en",
            user: { id: launch.editorUserName, name: launch.editorUserName },
            customization: {
              autosave: true,
              forcesave: true,
              help: false,
              // No "download as" or print — the controlled-copy path is the only sanctioned
              // way a document leaves this system.
              compactHeader: true,
              toolbarNoTabs: false,
            },
          },
          events: {
            onError: (event: unknown) => {
              console.error("OnlyOffice editor error", event);
              setError({
                message:
                  "The editor reported an error. Your work may not have saved — check the " +
                  "document's edit history before closing.",
              });
            },
          },
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError({ message: err instanceof Error ? err.message : "Editor failed to load." });
        }
      });

    return () => {
      cancelled = true;
      // Tears the iframe down on unmount. Does NOT release the check-out — see the note above.
      try {
        editorRef.current?.destroyEditor();
      } catch {
        // destroyEditor throws if the editor never finished mounting; nothing to do about it.
      }
      editorRef.current = null;
    };
  }, [launch]);

  if (!id) return null;

  /* ------------------------------------------------------------------ error states */
  if (error && !launch) {
    const isLocked = error.code === "document_checked_out";
    const notConfigured = error.code === "editor_not_configured";

    return (
      <div className="mx-auto max-w-lg py-12">
        <Link
          to={`/documents/${id}`}
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to document
        </Link>

        <div className="rounded-xl border border-border bg-surface-raised p-6 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-tint">
            {isLocked ? (
              <Lock className="h-6 w-6 text-stage-review" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-danger" aria-hidden="true" />
            )}
          </span>

          <h1 className="font-display text-lg font-semibold text-text-primary">
            {isLocked
              ? "Checked out by someone else"
              : notConfigured
                ? "In-browser editing isn't set up"
                : "Can't open the editor"}
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-text-secondary">{error.message}</p>

          {notConfigured && (
            <p className="mt-3 text-xs text-text-tertiary">
              An administrator needs to configure a document server (DocumentServer__Url,
              CallbackBaseUrl and TokenSecret) on the API.
            </p>
          )}

          <button
            type="button"
            onClick={() => navigate(`/documents/${id}`)}
            className="mt-5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface"
          >
            Back to document
          </button>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------------- editor */
  return (
    // Explicit viewport-based height rather than h-full: AppShell's <main> is a flex child
    // with flex-1 but is not itself a flex container, so h-full here would have no resolved
    // height to inherit and the editor iframe would collapse to nothing. 4rem is the top bar,
    // 4rem the main element's own p-8 padding.
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={`/documents/${id}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </Link>
            {launch && (
              <span className="font-mono text-sm font-semibold text-text-primary">
                {launch.documentNumber}
              </span>
            )}
          </div>
          {launch && (
            <p className="mt-0.5 text-xs text-text-tertiary">
              Checked out to you until {formatDateTime(launch.expiresAt)}. Saves are automatic.
            </p>
          )}
        </div>

        {launch && (
          <button
            type="button"
            onClick={() => setShowRelease(true)}
            className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface"
          >
            Finish editing
          </button>
        )}
      </div>

      {error && launch && (
        <div role="alert" className="mb-3 rounded-[9px] border border-danger/25 bg-danger-tint px-3.5 py-2.5 text-[13px] text-[#9c332f]">
          {error.message}
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface-raised">
        {isStarting && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Checking out the document…
          </div>
        )}
        {/* OnlyOffice replaces this element with its own iframe. */}
        <div id={EDITOR_ELEMENT_ID} className="h-full w-full" />
      </div>

      <ConfirmDialog
        open={showRelease}
        title="Finish editing?"
        description={
          <>
            Releases your check-out so someone else can edit. Anything you've typed is saved
            automatically — but give the editor a moment to finish before leaving if you've
            just made a change.
          </>
        }
        confirmLabel="Finish editing"
        onCancel={() => setShowRelease(false)}
        onConfirm={async () => {
          try {
            await releaseEditingSession(id);
            navigate(`/documents/${id}`);
          } catch (err) {
            throw new Error(
              err instanceof ApiError ? err.message : "Could not release the check-out.",
            );
          }
        }}
      />
    </div>
  );
}
