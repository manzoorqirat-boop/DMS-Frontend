import { useState } from "react";
import { AlertTriangle, FileType2, Loader2 } from "lucide-react";
import { startDesktopEditSession } from "@/api/editing";
import { ApiError } from "@/lib/api-client";
import type { DesktopEditLaunchView } from "@/types/editing";

/**
 * Opens a checked-out document in desktop Microsoft Word.
 *
 * Worth understanding before using this rather than the in-browser editor: this path
 * downloads the controlled file to the user's machine, where it stays in Word's temp and
 * cache directories after they finish. The in-browser editor was built specifically so that
 * never happened. Integrity is enforced when Word saves back — the same protection and
 * metadata verification the browser path runs — so tampering is caught, but the copy on the
 * workstation is not something DMS can clean up.
 *
 * Windows with desktop Word only. The ms-word: protocol handler is registered by Office at
 * install time; elsewhere the navigation silently does nothing, which is why the fallback
 * below exists rather than leaving someone clicking a button that appears broken.
 */
export function DesktopEditButton({ documentId }: { documentId: string }) {
  const [isStarting, setIsStarting] = useState(false);
  const [launch, setLaunch] = useState<DesktopEditLaunchView | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsStarting(true);
    setError(null);

    try {
      const result = await startDesktopEditSession(documentId);
      setLaunch(result);

      // Navigating the current window rather than window.open: a protocol handler doesn't
      // produce a page, so window.open would leave an empty tab behind. Assigning to
      // location.href hands the URL to the OS and leaves this page where it is.
      window.location.href = result.protocolUrl;
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not check the document out for editing.",
      );
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isStarting}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface disabled:opacity-60"
      >
        {isStarting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <FileType2 className="h-4 w-4" aria-hidden="true" />
        )}
        Open in Word
      </button>

      {error && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] text-[#9c332f]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
          {error}
        </p>
      )}

      {launch && !error && (
        <div className="mt-3 rounded-[9px] border border-border bg-surface p-3.5 text-[13px] leading-relaxed text-text-secondary">
          <p className="font-medium text-text-primary">Word should be opening.</p>
          <p className="mt-1">
            The document is checked out to you until{" "}
            {new Date(launch.expiresAt).toLocaleString()}. Save in Word as normal — each save
            returns to DMS and is checked. Use <strong>Finish editing</strong> on the document
            page when you're done, so someone else can take it.
          </p>
          <p className="mt-2">
            Nothing happened? Word may not be installed, or your browser may have blocked the
            handler. Paste this into Word's File → Open box:
          </p>
          <code className="mt-1.5 block break-all rounded border border-border bg-surface-raised px-2 py-1.5 font-mono text-[11px] text-text-primary">
            {launch.webDavUrl}
          </code>
          <p className="mt-2 text-xs text-text-tertiary">
            This copy lives on your computer while you work on it. Delete it when you're
            finished — DMS can't remove it for you.
          </p>
        </div>
      )}
    </div>
  );
}
