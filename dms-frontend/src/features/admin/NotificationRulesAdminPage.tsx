import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Bell, Loader2 } from "lucide-react";
import {
  createNotificationRule,
  disableNotificationRule,
  enableNotificationRule,
  getNotificationRuleOptions,
  listNotificationRules,
  previewNotificationTemplate,
  updateNotificationRule,
} from "@/api/notifications";
import { listRoles } from "@/api/roles";
import { ApiError } from "@/lib/api-client";
import { humanizeAction } from "@/lib/format";
import { useOrganisationData } from "@/features/organisation/useOrganisationData";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import type { RoleView } from "@/types/access";
import type {
  MessagePreview,
  NotificationKind,
  NotificationRecipientMode,
  NotificationRuleOptions,
  NotificationRuleView,
} from "@/types/notifications";

const inputClasses =
  "w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[9px] text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand-tint";

/**
 * Editing an existing rule in place, one card per rule.
 *
 * Rules are disabled rather than deleted: a rule that vanishes leaves no trace of why the
 * reminders stopped, whereas a disabled one stays visible with its history intact. That's why
 * there's no delete button here at all.
 */
function RuleCard({
  rule,
  roles,
  onChanged,
  onError,
}: {
  rule: NotificationRuleView;
  roles: RoleView[];
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [recipientMode, setRecipientMode] = useState(rule.recipientMode);
  const [recipientRoleId, setRecipientRoleId] = useState(rule.recipientRoleId ?? "");
  const [leadDays, setLeadDays] = useState(String(rule.leadDays));
  const [repeatEveryDays, setRepeatEveryDays] = useState(String(rule.repeatEveryDays));
  const [subjectTemplate, setSubjectTemplate] = useState(rule.subjectTemplate);
  const [bodyTemplate, setBodyTemplate] = useState(rule.bodyTemplate);
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState<MessagePreview | null>(null);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await updateNotificationRule(rule.id, {
        recipientMode,
        recipientRoleId: recipientMode === "RoleHolders" ? recipientRoleId || null : null,
        leadDays: Number(leadDays),
        repeatEveryDays: Number(repeatEveryDays),
        subjectTemplate,
        bodyTemplate,
      });
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Could not save that rule.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePreview() {
    try {
      setPreview(
        await previewNotificationTemplate({ kind: rule.kind, subjectTemplate, bodyTemplate }),
      );
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Could not render that template.");
    }
  }

  async function handleToggle() {
    try {
      if (rule.isEnabled) {
        await disableNotificationRule(rule.id);
      } else {
        await enableNotificationRule(rule.id);
      }
      onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Could not change that rule.");
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className={`rounded-xl border p-4 ${
        rule.isEnabled ? "border-border bg-surface-raised" : "border-border bg-surface opacity-75"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-semibold text-text-primary">
            {humanizeAction(rule.kind)}
          </h3>
          <p className="text-xs text-text-tertiary">{rule.documentTypeScope}</p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface"
        >
          {rule.isEnabled ? "Disable" : "Enable"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-xs font-semibold text-text-primary">
          Send to
          <select
            value={recipientMode}
            onChange={(e) => setRecipientMode(e.target.value as NotificationRecipientMode)}
            className={`mt-1 ${inputClasses}`}
          >
            {(["DocumentAuthor", "RoleHolders", "CopyIssuer", "StepAssignee"] as const).map((m) => (
              <option key={m} value={m}>
                {humanizeAction(m)}
              </option>
            ))}
          </select>
        </label>

        {recipientMode === "RoleHolders" && (
          <label className="text-xs font-semibold text-text-primary">
            Role
            <select
              value={recipientRoleId}
              onChange={(e) => setRecipientRoleId(e.target.value)}
              className={`mt-1 ${inputClasses}`}
            >
              <option value="">Choose…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="text-xs font-semibold text-text-primary">
          Lead days
          <input
            type="number"
            min={0}
            value={leadDays}
            onChange={(e) => setLeadDays(e.target.value)}
            className={`mt-1 ${inputClasses}`}
          />
        </label>

        <label className="text-xs font-semibold text-text-primary">
          Repeat every (days)
          <input
            type="number"
            min={0}
            value={repeatEveryDays}
            onChange={(e) => setRepeatEveryDays(e.target.value)}
            className={`mt-1 ${inputClasses}`}
          />
        </label>
      </div>

      <label className="mt-3 block text-xs font-semibold text-text-primary">
        Subject
        <input
          value={subjectTemplate}
          onChange={(e) => setSubjectTemplate(e.target.value)}
          className={`mt-1 font-mono ${inputClasses}`}
        />
      </label>

      <label className="mt-3 block text-xs font-semibold text-text-primary">
        Body
        <textarea
          rows={3}
          value={bodyTemplate}
          onChange={(e) => setBodyTemplate(e.target.value)}
          className={`mt-1 font-mono ${inputClasses}`}
        />
      </label>

      <p className="mt-2 text-[11px] text-text-tertiary">
        Tokens: {rule.availableTokens.map((t) => `{${t}}`).join(" ")}
      </p>

      {preview && (
        <div className="mt-3 rounded-lg border border-border bg-surface p-3 text-[13px]">
          <p className="font-semibold text-text-primary">{preview.subject}</p>
          <p className="mt-1 whitespace-pre-wrap text-text-secondary">{preview.body}</p>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Save
        </button>
        <button
          type="button"
          onClick={handlePreview}
          className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface"
        >
          Preview
        </button>
      </div>
    </form>
  );
}

export function NotificationRulesAdminPage() {
  const { documentTypes } = useOrganisationData();

  const [rules, setRules] = useState<NotificationRuleView[]>([]);
  const [roles, setRoles] = useState<RoleView[]>([]);
  const [options, setOptions] = useState<NotificationRuleOptions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const [newKind, setNewKind] = useState<NotificationKind>("ReviewComingDue");
  const [newTypeId, setNewTypeId] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    Promise.all([listRoles(false), getNotificationRuleOptions()])
      .then(([r, o]) => {
        setRoles(r);
        setOptions(o);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    listNotificationRules()
      .then(setRules)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Could not load notification rules."),
      )
      .finally(() => setIsLoading(false));
  }, [refreshToken]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsCreating(true);
    try {
      await createNotificationRule({
        kind: newKind,
        documentTypeId: newTypeId || null,
        recipientMode: "DocumentAuthor",
        recipientRoleId: null,
        leadDays: 30,
        repeatEveryDays: 7,
        subjectTemplate: "{DocumentNumber} needs attention",
        bodyTemplate: "{DocumentNumber} ({Title}) requires action.",
      });
      setNewTypeId("");
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create that rule.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Notification rules"
        description="What the nightly sweep sends, to whom, and how far ahead. Rules are disabled rather than deleted, so a stopped reminder still leaves a trace of why."
      />

      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-[9px] border border-danger/25 bg-danger-tint px-3.5 py-2.5 text-[13px] text-[#9c332f]">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-text-tertiary/10" />
          ))}
        </div>
      )}

      {!isLoading && rules.length === 0 && (
        <div className="rounded-xl border border-border bg-surface-raised">
          <EmptyState
            icon={Bell}
            title="No notification rules"
            description="The bootstrap seeder normally creates a default set. Without any rules, the nightly sweep runs but sends nothing."
          />
        </div>
      )}

      {!isLoading && rules.length > 0 && (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              roles={roles}
              onChanged={() => setRefreshToken((t) => t + 1)}
              onError={setError}
            />
          ))}
        </div>
      )}

      <form onSubmit={handleCreate} className="mt-6 rounded-xl border border-border bg-surface-raised p-4">
        <h2 className="mb-3 font-display text-sm font-semibold text-text-primary">
          Add a rule
        </h2>
        <p className="mb-3 text-xs text-text-secondary">
          Created with sensible defaults, then edited above. A rule scoped to a document type
          overrides the organisation-wide rule for that same kind.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold text-text-primary">
            Kind
            <select
              value={newKind}
              onChange={(e) => setNewKind(e.target.value as NotificationKind)}
              className={`mt-1 ${inputClasses}`}
            >
              {(options?.kinds ?? []).map((k) => (
                <option key={k.name} value={k.name}>
                  {humanizeAction(k.name)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-text-primary">
            Document type (optional)
            <select
              value={newTypeId}
              onChange={(e) => setNewTypeId(e.target.value)}
              className={`mt-1 ${inputClasses}`}
            >
              <option value="">All types</option>
              {documentTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} — {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={isCreating}
          className="mt-3 flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {isCreating && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Add rule
        </button>
      </form>
    </div>
  );
}
