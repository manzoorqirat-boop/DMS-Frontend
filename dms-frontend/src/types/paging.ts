/**
 * Mirrors Dms.Application.Common.PagedResult<T> exactly — every list endpoint that grows with
 * usage (documents, templates, audit, print history, the three worklist reports) returns this
 * envelope rather than a bare array. See PagingExtensions.ToPagedResultAsync on the backend
 * for where these numbers come from.
 */
export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
}

/** Query params every paged list endpoint accepts. Page size is clamped server-side at 200. */
export interface PagingParams {
  page?: number;
  pageSize?: number;
}

/** Builds a query string, omitting undefined/empty values rather than sending `page=undefined`. */
export function toQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") {
      continue;
    }
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}
