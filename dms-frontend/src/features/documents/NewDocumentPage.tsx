import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, FilePlus2, Loader2 } from "lucide-react";
import { createDraft } from "@/api/documents";
import { ApiError } from "@/lib/api-client";
import { useOrganisationData } from "@/features/organisation/useOrganisationData";
import { EmptyState } from "@/components/EmptyState";

/**
 * Creates a Draft from the Active template for the chosen document type — there is no
 * template picker here on purpose. DraftCreationService resolves the one Active template for
 * the type server-side and fails with `no_active_template` if none has been registered and
 * activated yet; that failure is shown as-is (via ApiError.message) rather than guessed at,
 * since fixing it means going to Templates admin, not retrying this form.
 */
export function NewDocumentPage() {
  const navigate = useNavigate();
  const { sites, departments, documentTypes, isLoading: isLoadingOrganisation } = useOrganisationData();

  const [siteId, setSiteId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [documentTypeId, setDocumentTypeId] = useState("");
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const departmentsForSite = useMemo(
    () => departments.filter((d) => d.siteId === siteId),
    [departments, siteId],
  );

  function handleSiteChange(nextSiteId: string) {
    setSiteId(nextSiteId);
    // A department chosen under the previous site isn't valid under the new one — clearing it
    // beats silently submitting a department/site pair the backend would reject as a mismatch.
    setDepartmentId("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!siteId || !departmentId || !documentTypeId || !title.trim()) {
      setError("Site, department, document type, and title are all required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createDraft({
        siteId,
        departmentId,
        documentTypeId,
        title: title.trim(),
      });
      navigate(`/documents/${created.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server. Check your connection and try again.");
      setIsSubmitting(false);
    }
  }

  const hasNoMasterData =
    !isLoadingOrganisation && (sites.length === 0 || documentTypes.length === 0);

  return (
    <div className="max-w-xl">
      <Link
        to="/documents"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to documents
      </Link>

      <h1 className="mb-1.5 font-display text-2xl font-semibold text-text-primary">New document</h1>
      <p className="mb-8 text-sm text-text-secondary">
        Opens a Draft from the Active template registered for the document type you choose.
      </p>

      {hasNoMasterData ? (
        <EmptyState
          icon={FilePlus2}
          title="Nothing to create against yet"
          description={
            sites.length === 0
              ? "No sites are configured yet. Add a site before a document can be created."
              : "No document types are configured yet. Add one before a document can be created."
          }
        />
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-[9px] border border-danger/25 bg-danger-tint px-3.5 py-2.5 text-[13px] leading-snug text-[#9c332f]"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="site" className="mb-[7px] block text-[13px] font-semibold text-text-primary">
              Site
            </label>
            <select
              id="site"
              required
              value={siteId}
              onChange={(e) => handleSiteChange(e.target.value)}
              className="w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[11px] text-[14.5px] text-text-primary focus:border-brand focus:outline-none focus:ring-[3.5px] focus:ring-brand-tint"
            >
              <option value="" disabled>
                Select a site…
              </option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.code} — {site.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="department" className="mb-[7px] block text-[13px] font-semibold text-text-primary">
              Department
            </label>
            <select
              id="department"
              required
              disabled={!siteId}
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[11px] text-[14.5px] text-text-primary focus:border-brand focus:outline-none focus:ring-[3.5px] focus:ring-brand-tint disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="" disabled>
                {siteId ? "Select a department…" : "Choose a site first"}
              </option>
              {departmentsForSite.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code} — {department.name}
                </option>
              ))}
            </select>
            {siteId && departmentsForSite.length === 0 && (
              <p className="mt-1.5 text-xs text-text-tertiary">
                No departments are configured for this site yet.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="documentType" className="mb-[7px] block text-[13px] font-semibold text-text-primary">
              Document type
            </label>
            <select
              id="documentType"
              required
              value={documentTypeId}
              onChange={(e) => setDocumentTypeId(e.target.value)}
              className="w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[11px] text-[14.5px] text-text-primary focus:border-brand focus:outline-none focus:ring-[3.5px] focus:ring-brand-tint"
            >
              <option value="" disabled>
                Select a document type…
              </option>
              {documentTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.code} — {type.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="title" className="mb-[7px] block text-[13px] font-semibold text-text-primary">
              Title
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cleaning Validation Master Plan"
              className="w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[11px] text-[14.5px] text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-[3.5px] focus:ring-brand-tint"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 rounded-[9px] bg-brand px-4 py-3 text-[14.5px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isSubmitting ? "Creating…" : "Create draft"}
            </button>
            <Link
              to="/documents"
              className="rounded-[9px] px-4 py-3 text-[14.5px] font-medium text-text-secondary hover:text-text-primary"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
