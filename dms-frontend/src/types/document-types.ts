/**
 * Mirrors Dms.Application.DocumentTypes.DocumentTypeDtos.DocumentTypeSummary. Master data,
 * not paged — see the backend README's distinction between lists that grow with usage
 * (paged) and lists bounded by configuration (not paged). A company might have a few dozen
 * document types; it will never have thousands, so GET /api/document-types returns a plain
 * array.
 */
export interface DocumentTypeSummary {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

/** POST /api/document-types body. Verified against DocumentTypeDtos.CreateDocumentTypeRequest. */
export interface CreateDocumentTypeRequest {
  code: string;
  name: string;
}
