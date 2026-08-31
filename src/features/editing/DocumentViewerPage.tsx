import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Eye, Loader2 } from "lucide-react";
import { startViewSession } from "@/api/editing";
import { loadOnlyOfficeApi, type OnlyOfficeEditorInstance } from "@/lib/onlyoffice";
import { ApiError } from "@/lib/api-client";
import type { ViewerLaunchView } from "@/types/editing";

const VIEWER_ELEMENT_ID = "dms-onlyoffice-viewer";

/**
 * Read-only document viewer.
 *
 * Exists because a reviewer or approver cannot meaningfully sign a document they have not
 * read, and until now there was no way for them to read one — the working-copy endpoint was
 * never called from anywhere in the UI. A signature applied to unseen content is worse than
 * no signature: it carries the same regulatory weight while attesting to nothing.
 *
 * Takes no check-out, so it never competes with the author's edit lock and several reviewers
 * can read at once. Nothing here can write back: the launch payload carries no callback URL,
 * and the API issues no callback token for a view.
 */
export function DocumentViewerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [launch, setLaunch] = useState<ViewerLaunchView | null>(null);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);
  const [isStarting, setIsStarting] = useState(true);

  const viewerRef = useRef<OnlyOfficeEditorInstance | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    setIsStarting(true);
    setError(null);

    startViewSession(id)
      .then((view) => {
        if (!cancelled) setLaunch(view);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? { code: err.code, message: err.message }
            : { message: "Could not open the document." },
        );
      })
      .finally(() => {
        if (!cancelled) setIsStarting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!launch) return;
    let cancelled = false;

    loadOnlyOfficeApi(launch.documentServerUrl)
      .then(() => {
        if (cancelled || !window.DocsAPI) return;

        viewerRef.current = new window.DocsAPI.DocEditor(VIEWER_ELEMENT_ID, {
          documentType: "word",
          type: "desktop",
          width: "100%",
          height: "100%",
          document: {
            fileType: "docx",
            key: launch.documentKey,
            title: `${launch.documentNumber} — ${launch.title}`,
            url: launch.fileUrl,
            permissions: {
              // The whole point of this screen. Everything else follows from it.
              edit: false,
              // Download and print stay closed even here: the controlled-copy path is the
              // only sanctioned way a document leaves this system, and a reviewer reading a
              // draft has less reason to bypass it than anyone.
              download: false,
              print: false,
              review: false,
              chat: false,
              comment: false,
              fillForms: false,
            },
          },
          editorConfig: {
            // No callbackUrl: there is nothing to save to.
            mode: "view",
            lang: "en",
            user: { id: launch.viewerUserName, name: launch.viewerUserName },
            customization: {
              help: false,
              compactHeader: true,
            },
          },
          events: {
            onError: (event: unknown) => {
              console.error("OnlyOffice viewer error", event);
              setError({ message: "The viewer reported an error loading this document." });
            },
          },
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError({ message: err instanceof Error ? err.message : "Viewer failed to load." });
        }
      });

    return () => {
      cancelled = true;
      try {
        viewerRef.current?.destroyEditor();
      } catch {
        // destroyEditor throws if the viewer never finished mounting; nothing to do.
      }
      viewerRef.current = null;
    };
  }, [launch]);

  if (!id) return null;

  if (error && !launch) {
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
            <AlertTriangle className="h-6 w-6 text-danger" aria-hidden="true" />
          </span>
          <h1 className="font-display text-lg font-semibold text-text-primary">
            {notConfigured ? "In-browser viewing isn't set up" : "Can't open this document"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">{error.message}</p>
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

  return (
    // Same explicit viewport height as the editor: AppShell's <main> is a flex child, not a
    // flex container, so h-full would collapse the iframe.
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
                {launch.documentNumber} Rev {launch.revision}
              </span>
            )}
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-text-tertiary">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            Read-only. Nothing you do here changes the document.
          </p>
        </div>
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
            Opening the document…
          </div>
        )}
        <div id={VIEWER_ELEMENT_ID} className="h-full w-full" />
      </div>
    </div>
  );
}
