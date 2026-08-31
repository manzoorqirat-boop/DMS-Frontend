/**
 * Mirrors Dms.Application.Metadata.MetadataDtos.
 *
 * MetadataSource is a closed enum on the backend because every value maps to real resolver
 * code — offering one that nothing resolves would produce a permanently blank content control
 * on every document of that type. GET /api/metadata-fields/sources returns the live list;
 * this union exists for compile-time safety, and the two should be kept in step.
 */
export type MetadataSource =
  | "DocumentNumber"
  | "DocumentTitle"
  | "Revision"
  | "EffectiveDate"
  | "DepartmentName"
  | "DepartmentCode"
  | "SiteName"
  | "SiteCode"
  | "DocumentTypeName"
  | "DocumentTypeCode"
  | "Author"
  | "AuthorFullName"
  | "CreatedDate"
  | "Status";

export interface MetadataFieldView {
  id: string;
  documentTypeId: string;
  tag: string;
  label: string;
  source: MetadataSource;
  displayOrder: number;
  isRequired: boolean;
  createdAt: string;
}

export interface CreateMetadataFieldRequest {
  documentTypeId: string;
  tag: string;
  label: string;
  source: MetadataSource;
  displayOrder: number;
  isRequired: boolean;
}

export interface UpdateMetadataFieldRequest {
  label: string;
  source: MetadataSource;
  displayOrder: number;
  isRequired: boolean;
}
