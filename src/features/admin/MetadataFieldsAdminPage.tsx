import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Loader2, Tags, Trash2 } from "lucide-react";
import {
  createMetadataField,
  deleteMetadataField,
  listMetadataFields,
  listMetadataSources,
  updateMetadataField,
} from "@/api/metadata";
import { ApiError } from "@/lib/api-client";
import { useOrganisationData } from "@/features/organisation/useOrganisationData";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { MetadataFieldView, MetadataSource } from "@/types/metadata";

const inputClasses =
  "w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[9px] text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand-tint";

/**
 * Maps a customer's own Word content-control tag names onto the values DMS knows how to fill.
 *
 * This exists so a company doesn't have to rename the content controls in templates it has
 * used for years: if their header says {{doc_no}}, a field maps that tag to DocumentNumber and
 * everything works. The tag is fixed once created — renaming it would silently orphan every
 * template already relying on the old name, so the backend refuses and this screen offers
 * delete-and-recreate instead.
 */
export function MetadataFieldsAdminPage() {
  const { documentTypes } = useOrganisationData();

  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [fields, setFields] = useState<MetadataFieldView[]>([]);
  const [sources, setSources] = useState<MetadataSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [toDelete, setToDelete] = useState<MetadataFieldView | null>(null);

  const [tag, setTag] = useState("");
  const [label, setLabel] = useState("");
  const [source, setSource] = useState<MetadataSource>("DocumentNumber");
  const [displayOrder, setDisplayOrder] = useState("1");
  const [isRequired, setIsRequired] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    listMetadataSources()
      .then(setSources)
      .catch(() => setSources([]));
  }, []);

  useEffect(() => {
    if (!selectedTypeId) {
      setFields([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    listMetadataFields(selectedTypeId)
      .then(setFields)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Could not load metadata fields."),
      )
      .finally(() => setIsLoading(false));
  }, [selectedTypeId, refreshToken]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!selectedTypeId) {
      setError("Choose a document type first.");
      return;
    }
    if (!tag.trim() || !label.trim()) {
      setError("A tag and a label are both required.");
      return;
    }

    setIsSaving(true);
    try {
      await createMetadataField({
        documentTypeId: selectedTypeId,
        tag: tag.trim(),
        label: label.trim(),
        source,
        displayOrder: Number(displayOrder),
        isRequired,
      });
      setTag("");
      setLabel("");
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add that field.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdate(field: MetadataFieldView, patch: Partial<MetadataFieldView>) {
    try {
      await updateMetadataField(field.id, {
        label: patch.label ?? field.label,
        source: patch.source ?? field.source,
        displayOrder: patch.displayOrder ?? field.displayOrder,
        isRequired: patch.isRequired ?? field.isRequired,
      });
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update that field.");
    }
  }

  const columns: DataTableColumn<MetadataFieldView>[] = [
    { key: "order", header: "#", className: "font-mono", render: (f) => f.displayOrder },
    { key: "tag", header: "Tag in template", className: "font-mono text-xs", render: (f) => f.tag },
    { key: "label", header: "Label", render: (f) => f.label },
    {
      key: "source",
      header: "Filled with",
      render: (f) => (
        <select
          value={f.source}
          onChange={(e) => handleUpdate(f, { source: e.target.value as MetadataSource })}
          className="rounded-md border border-border bg-surface-raised px-2 py-1 text-sm"
        >
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "required",
      header: "Required",
      render: (f) => (
        <input
          type="checkbox"
          checked={f.isRequired}
          onChange={(e) => handleUpdate(f, { isRequired: e.target.checked })}
          className="h-4 w-4 rounded border-border text-brand focus:ring-brand-tint"
        />
      ),
    },
    {
      key: "actions",
      header: "",
      render: (f) => (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setToDelete(f)}
            className="flex items-center gap-1 rounded-md border border-danger/30 px-2.5 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger-tint"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Remove
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Metadata fields"
        description="Maps the content-control tags in your Word templates to the values DMS fills in. Configure these to match templates you already use, rather than editing the templates."
      />

      <div className="mb-4">
        <select
          value={selectedTypeId}
          onChange={(e) => setSelectedTypeId(e.target.value)}
          className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary"
        >
          <option value="">Choose a document type…</option>
          {documentTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.code} — {t.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-[9px] border border-danger/25 bg-danger-tint px-3.5 py-2.5 text-[13px] text-[#9c332f]">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {!selectedTypeId ? (
        <div className="rounded-xl border border-border bg-surface-raised">
          <EmptyState
            icon={Tags}
            title="Choose a document type"
            description="Metadata fields are configured per document type."
          />
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={fields}
            getRowKey={(f) => f.id}
            isLoading={isLoading}
            skeletonRowCount={4}
            emptyState={
              <EmptyState
                icon={Tags}
                title="Using the built-in defaults"
                description="This type has no custom fields, so the standard set is used. Adding one here replaces that default set entirely."
              />
            }
          />

          <form onSubmit={handleCreate} className="mt-6 rounded-xl border border-border bg-surface-raised p-4">
            <h2 className="mb-3 font-display text-sm font-semibold text-text-primary">Add a field</h2>
            <div className="grid gap-3 sm:grid-cols-5">
              <label className="text-xs font-semibold text-text-primary">
                Tag in template
                <input
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="doc_no"
                  className={`mt-1 font-mono ${inputClasses}`}
                />
              </label>

              <label className="text-xs font-semibold text-text-primary">
                Label
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Document Number"
                  className={`mt-1 ${inputClasses}`}
                />
              </label>

              <label className="text-xs font-semibold text-text-primary">
                Filled with
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as MetadataSource)}
                  className={`mt-1 ${inputClasses}`}
                >
                  {sources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold text-text-primary">
                Order
                <input
                  type="number"
                  min={1}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                  className={`mt-1 ${inputClasses}`}
                />
              </label>

              <label className="flex items-end gap-2 text-xs font-semibold text-text-primary">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="mb-2.5 h-4 w-4 rounded border-border text-brand focus:ring-brand-tint"
                />
                <span className="mb-2">Required</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="mt-3 flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Add field
            </button>
          </form>
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        destructive
        title={`Remove the ${toDelete?.tag} field?`}
        description="Templates for this document type that still contain this tag will fail validation until the tag is removed from them, or the field is added back."
        confirmLabel="Remove field"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await deleteMetadataField(toDelete.id);
          setToDelete(null);
          setRefreshToken((t) => t + 1);
        }}
      />
    </div>
  );
}
