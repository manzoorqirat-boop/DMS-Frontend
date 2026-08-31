import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Download, FileWarning, Loader2, Plus } from "lucide-react";
import {
  createDocumentType,
  deactivateDocumentType,
  listDocumentTypes,
  reactivateDocumentType,
} from "@/api/documentTypes";
import {
  activateTemplate,
  downloadTemplateFile,
  listTemplates,
  registerTemplate,
  retireTemplate,
} from "@/api/templates";
import { ApiError } from "@/lib/api-client";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import type { DocumentTypeSummary } from "@/types/document-types";
import type { TemplateStatus, TemplateSummary } from "@/types/templates";

const inputClasses =
  "w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[9px] text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand-tint";

function ErrorBanner({ message }: { message: string }) {
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

/**
 * Deliberately not using the document lifecycle's STAGE_CLASSES/`stage-*` palette here — see
 * lib/lifecycle.ts's own comment that those colors mean one specific thing (a document's
 * status) everywhere in the app. A template's status is a different axis entirely, so it gets
 * its own small, generic-token-only badge rather than borrowing that vocabulary.
 */
function TemplateStatusBadge({ status }: { status: TemplateStatus }) {
  const classes: Record<TemplateStatus, string> = {
    Active: "bg-brand-tint text-brand",
    ValidationPassed: "bg-text-tertiary/10 text-text-primary",
    ValidationFailed: "bg-danger-tint text-[#9c332f]",
    PendingValidation: "bg-text-tertiary/10 text-text-secondary",
    Retired: "bg-text-tertiary/10 text-text-tertiary",
  };
  const labels: Record<TemplateStatus, string> = {
    Active: "Active",
    ValidationPassed: "Validated",
    ValidationFailed: "Validation failed",
    PendingValidation: "Pending validation",
    Retired: "Retired",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes[status]}`}>
      {labels[status]}
    </span>
  );
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TemplatesAdminPage() {
  // Fetched independently from OrganisationDataContext (which only ever loads active
  // records, once, at session start) — admin provisioning needs to see and manage inactive
  // ones too, and see changes immediately without waiting for a full app remount.
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeSummary[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [typeError, setTypeError] = useState<string | null>(null);

  const [newTypeCode, setNewTypeCode] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [isCreatingType, setIsCreatingType] = useState(false);

  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateFile, setNewTemplateFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isRegistering, setIsRegistering] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);

  function refreshDocumentTypes() {
    setIsLoadingTypes(true);
    setTypeError(null);
    listDocumentTypes(true)
      .then(setDocumentTypes)
      .catch((err: unknown) => {
        setTypeError(err instanceof ApiError ? err.message : "Could not load document types.");
      })
      .finally(() => setIsLoadingTypes(false));
  }

  useEffect(refreshDocumentTypes, []);

  function refreshTemplates(documentTypeId: string) {
    if (!documentTypeId) {
      setTemplates([]);
      return;
    }
    setIsLoadingTemplates(true);
    setTemplateError(null);
    listTemplates({ documentTypeId, pageSize: 50 })
      .then((result) => setTemplates(result.items))
      .catch((err: unknown) => {
        setTemplateError(err instanceof ApiError ? err.message : "Could not load templates.");
      })
      .finally(() => setIsLoadingTemplates(false));
  }

  useEffect(() => {
    refreshTemplates(selectedTypeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshTemplates is stable in intent; re-running on its identity would refetch every render
  }, [selectedTypeId]);

  async function handleCreateType(event: FormEvent) {
    event.preventDefault();
    setTypeError(null);

    if (!newTypeCode.trim() || !newTypeName.trim()) {
      setTypeError("Both a code and a name are required.");
      return;
    }

    setIsCreatingType(true);
    try {
      await createDocumentType({ code: newTypeCode.trim(), name: newTypeName.trim() });
      setNewTypeCode("");
      setNewTypeName("");
      refreshDocumentTypes();
    } catch (err) {
      setTypeError(err instanceof ApiError ? err.message : "Could not create the document type.");
    } finally {
      setIsCreatingType(false);
    }
  }

  async function handleToggleTypeActive(type: DocumentTypeSummary) {
    setTypeError(null);
    try {
      if (type.isActive) {
        await deactivateDocumentType(type.id);
      } else {
        await reactivateDocumentType(type.id);
      }
      refreshDocumentTypes();
    } catch (err) {
      setTypeError(err instanceof ApiError ? err.message : "Could not update the document type.");
    }
  }

  async function handleRegisterTemplate(event: FormEvent) {
    event.preventDefault();
    setTemplateError(null);

    if (!selectedTypeId) {
      setTemplateError("Choose a document type first.");
      return;
    }
    if (!newTemplateFile) {
      setTemplateError("Choose a .docx file to upload.");
      return;
    }

    setIsRegistering(true);
    try {
      await registerTemplate(selectedTypeId, newTemplateName.trim(), newTemplateFile);
      setNewTemplateName("");
      setNewTemplateFile(null);
      setFileInputKey((k) => k + 1);
      refreshTemplates(selectedTypeId);
    } catch (err) {
      setTemplateError(err instanceof ApiError ? err.message : "Could not register the template.");
    } finally {
      setIsRegistering(false);
    }
  }

  async function handleActivate(template: TemplateSummary) {
    setTemplateError(null);
    setPendingTemplateId(template.id);
    try {
      await activateTemplate(template.id);
      refreshTemplates(selectedTypeId);
    } catch (err) {
      setTemplateError(err instanceof ApiError ? err.message : "Could not activate the template.");
    } finally {
      setPendingTemplateId(null);
    }
  }

  async function handleRetire(template: TemplateSummary) {
    setTemplateError(null);
    setPendingTemplateId(template.id);
    try {
      await retireTemplate(template.id);
      refreshTemplates(selectedTypeId);
    } catch (err) {
      setTemplateError(err instanceof ApiError ? err.message : "Could not retire the template.");
    } finally {
      setPendingTemplateId(null);
    }
  }

  async function handleDownload(template: TemplateSummary) {
    setTemplateError(null);
    try {
      const blob = await downloadTemplateFile(template.id);
      const sanitized = template.name.replace(/[^A-Za-z0-9-_]/g, "_").replace(/^_+|_+$/g, "");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${sanitized || "template"}_v${template.templateVersion}.docx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setTemplateError(err instanceof ApiError ? err.message : "Could not download the template file.");
    }
  }

  const activeDocumentTypes = documentTypes.filter((t) => t.isActive);

  const typeColumns: DataTableColumn<DocumentTypeSummary>[] = [
    { key: "code", header: "Code", className: "font-mono", render: (t) => t.code },
    { key: "name", header: "Name", render: (t) => t.name },
    {
      key: "status",
      header: "Status",
      render: (t) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            t.isActive ? "bg-brand-tint text-brand" : "bg-text-tertiary/10 text-text-tertiary"
          }`}
        >
          {t.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    { key: "createdAt", header: "Created", className: "font-mono text-xs", render: (t) => formatDateTime(t.createdAt) },
    {
      key: "actions",
      header: "",
      render: (t) => (
        <button
          type="button"
          onClick={() => handleToggleTypeActive(t)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
        >
          {t.isActive ? "Deactivate" : "Reactivate"}
        </button>
      ),
    },
  ];

  const templateColumns: DataTableColumn<TemplateSummary>[] = [
    { key: "version", header: "Ver", className: "font-mono", render: (t) => `v${t.templateVersion}` },
    { key: "name", header: "Name", render: (t) => t.name },
    { key: "status", header: "Status", render: (t) => <TemplateStatusBadge status={t.status} /> },
    { key: "createdBy", header: "Created by", render: (t) => t.createdBy },
    {
      key: "createdAt",
      header: "Created",
      className: "font-mono text-xs",
      render: (t) => formatDateTime(t.createdAt),
    },
    {
      key: "issues",
      header: "Validation",
      render: (t) =>
        t.validationIssues.length > 0 ? (
          <details>
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs text-[#9c332f] marker:content-none [&::-webkit-details-marker]:hidden">
              <FileWarning className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
              {t.validationIssues.length} issue{t.validationIssues.length === 1 ? "" : "s"}
            </summary>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-snug text-text-secondary">
              {t.validationIssues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </details>
        ) : (
          <span className="text-xs text-text-tertiary">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (t) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => handleDownload(t)}
            title="Download the .docx"
            className="rounded-lg border border-border p-1.5 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          {t.status === "ValidationPassed" && (
            <button
              type="button"
              disabled={pendingTemplateId === t.id}
              onClick={() => handleActivate(t)}
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
            >
              Activate
            </button>
          )}
          {t.status !== "Retired" && t.status !== "ValidationPassed" && (
            <button
              type="button"
              disabled={pendingTemplateId === t.id}
              onClick={() => handleRetire(t)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text-primary disabled:opacity-60"
            >
              Retire
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-primary">Document types &amp; templates</h1>
        <p className="mt-1 text-sm text-text-secondary">
          A document type needs an Active template before New document can create anything
          against it.
        </p>
      </div>

      {/* Document types */}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-text-primary">Document types</h2>

        {typeError && <ErrorBanner message={typeError} />}

        <form onSubmit={handleCreateType} className="mb-4 flex flex-wrap items-end gap-3">
          <div className="w-32">
            <label htmlFor="typeCode" className="mb-[6px] block text-xs font-semibold text-text-primary">
              Code
            </label>
            <input
              id="typeCode"
              value={newTypeCode}
              onChange={(e) => setNewTypeCode(e.target.value)}
              placeholder="SOP"
              className={inputClasses}
            />
          </div>
          <div className="flex-1 min-w-[220px]">
            <label htmlFor="typeName" className="mb-[6px] block text-xs font-semibold text-text-primary">
              Name
            </label>
            <input
              id="typeName"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="Standard Operating Procedure"
              className={inputClasses}
            />
          </div>
          <button
            type="submit"
            disabled={isCreatingType}
            className="flex items-center gap-1.5 rounded-[9px] bg-brand px-3.5 py-[9px] text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isCreatingType ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            Add type
          </button>
        </form>

        <DataTable
          columns={typeColumns}
          rows={documentTypes}
          getRowKey={(t) => t.id}
          isLoading={isLoadingTypes}
          skeletonRowCount={3}
          emptyState={
            <EmptyState
              icon={FileWarning}
              title="No document types yet"
              description="Add one above — New document needs at least one active type with an active template."
            />
          }
        />
      </section>

      {/* Templates */}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-text-primary">Templates</h2>

        <div className="mb-4 w-72">
          <label htmlFor="templateTypeFilter" className="mb-[6px] block text-xs font-semibold text-text-primary">
            Document type
          </label>
          <select
            id="templateTypeFilter"
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            className={inputClasses}
          >
            <option value="">Select a document type…</option>
            {activeDocumentTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code} — {t.name}
              </option>
            ))}
          </select>
          {activeDocumentTypes.length === 0 && !isLoadingTypes && (
            <p className="mt-1.5 text-xs text-text-tertiary">
              No active document types yet — add one above first.
            </p>
          )}
        </div>

        {selectedTypeId && (
          <>
            {templateError && <ErrorBanner message={templateError} />}

            <form onSubmit={handleRegisterTemplate} className="mb-4 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
                <label htmlFor="templateName" className="mb-[6px] block text-xs font-semibold text-text-primary">
                  Name <span className="font-normal text-text-tertiary">(optional — defaults to the filename)</span>
                </label>
                <input
                  id="templateName"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="SOP Template"
                  className={inputClasses}
                />
              </div>
              <div>
                <label htmlFor="templateFile" className="mb-[6px] block text-xs font-semibold text-text-primary">
                  File (.docx)
                </label>
                <input
                  key={fileInputKey}
                  id="templateFile"
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setNewTemplateFile(e.target.files?.[0] ?? null)}
                  className="block text-sm text-text-secondary file:mr-3 file:rounded-[9px] file:border-0 file:bg-text-tertiary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-text-primary hover:file:bg-text-tertiary/20"
                />
              </div>
              <button
                type="submit"
                disabled={isRegistering}
                className="flex items-center gap-1.5 rounded-[9px] bg-brand px-3.5 py-[9px] text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isRegistering ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                Register
              </button>
            </form>

            <DataTable
              columns={templateColumns}
              rows={templates}
              getRowKey={(t) => t.id}
              isLoading={isLoadingTemplates}
              skeletonRowCount={3}
              emptyState={
                <EmptyState
                  icon={FileWarning}
                  title="No templates for this type yet"
                  description="Register a .docx above. It has to pass structural validation before it can be activated."
                />
              }
            />
          </>
        )}
      </section>
    </div>
  );
}
