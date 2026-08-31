import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellOff, Check, Loader2 } from "lucide-react";
import { listMyNotifications, markNotificationRead } from "@/api/notifications";
import { ApiError } from "@/lib/api-client";
import { formatDateTime, humanizeAction } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import type { NotificationView } from "@/types/notifications";

/**
 * The caller's own notification inbox.
 *
 * Worth knowing while reading this screen: the backend queues notifications but its only
 * sender is LoggingNotificationSender, which writes to the application log rather than sending
 * mail. So this list is currently the *only* place a reminder is actually visible to anyone.
 */
export function NotificationsPage() {
  const navigate = useNavigate();

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [items, setItems] = useState<NotificationView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    listMyNotifications({ unreadOnly, limit: 100 }, controller.signal)
      .then(setItems)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.message : "Could not load notifications.");
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [unreadOnly]);

  async function handleMarkRead(notification: NotificationView) {
    if (notification.isRead) return;
    setMarkingId(notification.id);
    try {
      await markNotificationRead(notification.id);
      // Updated locally rather than refetching: marking one item read shouldn't cost a full
      // round trip, and under the unread-only filter the row should disappear immediately.
      setItems((prev) =>
        unreadOnly
          ? prev.filter((n) => n.id !== notification.id)
          : prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not mark that as read.");
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Notifications"
        description="Reminders raised by the nightly sweep — reviews falling due, signatures waiting on you, copies still owed back."
      />

      <label className="mb-4 flex w-fit items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={unreadOnly}
          onChange={(e) => setUnreadOnly(e.target.checked)}
          className="h-4 w-4 rounded border-border text-brand focus:ring-brand-tint"
        />
        Unread only
      </label>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-danger/25 bg-danger-tint px-4 py-3 text-sm text-[#9c332f]">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-text-tertiary/10" />
          ))}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="rounded-xl border border-border bg-surface-raised">
          <EmptyState
            icon={BellOff}
            title={unreadOnly ? "Nothing unread" : "No notifications"}
            description={
              unreadOnly
                ? "You've read everything currently in your inbox."
                : "Reminders will appear here once the nightly sweep has something to tell you."
            }
          />
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border bg-surface-raised p-4 transition-colors ${
                n.isRead ? "border-border" : "border-brand/30 bg-brand-tint/30"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {!n.isRead && (
                      <span aria-hidden="true" className="h-2 w-2 flex-none rounded-full bg-brand" />
                    )}
                    <h2 className="font-display text-sm font-semibold text-text-primary">
                      {n.subject}
                    </h2>
                    <span className="rounded-full bg-text-tertiary/10 px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                      {humanizeAction(n.kind)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{n.body}</p>
                  <p className="mt-2 font-mono text-[11px] text-text-tertiary">
                    {formatDateTime(n.createdAt)}
                    {n.status === "Failed" && " · delivery failed"}
                  </p>
                </div>

                <div className="flex flex-none flex-col items-end gap-2">
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(n)}
                      disabled={markingId === n.id}
                      className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface disabled:opacity-50"
                    >
                      {markingId === n.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      Mark read
                    </button>
                  )}
                  {n.subjectDocumentId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/documents/${n.subjectDocumentId}`)}
                      className="text-xs font-medium text-brand hover:underline"
                    >
                      Open document →
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
