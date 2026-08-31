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

  useEffect(() => {
    Promise.all([listSites(), listDepartments(), listDocumentTypes()])
      .then(([siteList, departmentList, typeList]) => {
        setSites(siteList);
        setDepartments(departmentList);
        setDocumentTypes(typeList);
      })
      // Missing master data degrades to showing raw ids/codes rather than breaking the
      // screens that depend on it — see the lookup functions below.
      .catch(() => undefined)
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
      isLoading,
      getSiteName: (id) => siteById.get(id)?.name ?? id,
      getDepartmentName: (id) => departmentById.get(id)?.name ?? id,
      getDocumentTypeLabel: (id) => {
        const type = typeById.get(id);
        return type ? `${type.code} — ${type.name}` : id;
      },
    };
  }, [sites, departments, documentTypes, isLoading]);

  return <OrganisationDataContext.Provider value={value}>{children}</OrganisationDataContext.Provider>;
}
