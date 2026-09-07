import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { listSites } from "@/api/sites";
import { listDepartments } from "@/api/departments";
import { listDocumentTypes } from "@/api/documentTypes";
import type { SiteSummary, DepartmentSummary } from "@/types/organisation";
import type { DocumentTypeSummary } from "@/types/document-types";

export interface OrganisationDataValue {
  sites: SiteSummary[];
  departments: DepartmentSummary[];
  documentTypes: DocumentTypeSummary[];
  /** Non-null when master data failed to load. Screens can surface it rather than
   *  rendering an empty dropdown that looks like missing data. */
  loadError: string | null;
  isLoading: boolean;
  getSiteName: (id: string) => string;
  getDepartmentName: (id: string) => string;
  getDocumentTypeLabel: (id: string) => string;
}

// eslint-disable-next-line react-refresh/only-export-components -- context object, not a component
export const OrganisationDataContext = createContext<OrganisationDataValue | undefined>(undefined);

/**
 * Fetches sites, departments, and document types once and holds them for every screen
 * underneath — mounted inside AppShell, not at the app root, since this data is only ever
 * needed once a session exists.
 * <p>
 * This exists because DocumentSummary carries siteId/departmentId/documentTypeId as raw GUIDs
 * with no names attached (see the backend's DTO — that's deliberate there, keeping the DTO
 * thin). Every screen that needs to show "Quality Assurance" instead of a UUID reads from
 * here rather than fetching and re-deriving the same three lists independently, which is
 * exactly the duplication that appeared the moment a second screen (the document detail page)
 * needed the same data the register's filter dropdown already had.
 * </p>
 */
export function OrganisationDataProvider({ children }: { children: ReactNode }) {
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // allSettled, not all. Promise.all rejects as soon as ONE call fails, which meant a single
    // failing endpoint left all three lists empty — every dropdown fed by this context silently
    // showed nothing, with no error anywhere to say why. Each list now loads independently, so
    // a document-type dropdown still works when the sites endpoint is having a bad day.
    Promise.allSettled([listSites(), listDepartments(), listDocumentTypes()])
      .then(([siteResult, departmentResult, typeResult]) => {
        if (siteResult.status === "fulfilled") setSites(siteResult.value);
        if (departmentResult.status === "fulfilled") setDepartments(departmentResult.value);
        if (typeResult.status === "fulfilled") setDocumentTypes(typeResult.value);

        // Surfaced rather than swallowed. A silently empty dropdown is the hardest kind of
        // failure to diagnose — it looks like missing data rather than a broken request, and
        // sends you looking in the wrong place entirely.
        const failed = [
          siteResult.status === "rejected" ? "sites" : null,
          departmentResult.status === "rejected" ? "departments" : null,
          typeResult.status === "rejected" ? "document types" : null,
        ].filter((x): x is string => x !== null);

        setLoadError(
          failed.length === 0
            ? null
            : `Could not load ${failed.join(", ")}. Dropdowns that depend on this will be empty.`,
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  const value = useMemo<OrganisationDataValue>(() => {
    const siteById = new Map(sites.map((s) => [s.id, s]));
    const departmentById = new Map(departments.map((d) => [d.id, d]));
    const typeById = new Map(documentTypes.map((t) => [t.id, t]));

    return {
      sites,
      departments,
      documentTypes,
      loadError,
      isLoading,
      getSiteName: (id) => siteById.get(id)?.name ?? id,
      getDepartmentName: (id) => departmentById.get(id)?.name ?? id,
      getDocumentTypeLabel: (id) => {
        const type = typeById.get(id);
        return type ? `${type.code} — ${type.name}` : id;
      },
    };
  }, [sites, departments, documentTypes, isLoading, loadError]);

  return <OrganisationDataContext.Provider value={value}>{children}</OrganisationDataContext.Provider>;
}
