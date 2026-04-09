/**
 * Relative URLs for tracker grid row operations (browser `fetch`).
 * Centralizes path shape so hooks and docs stay aligned with App Router routes.
 */
export function gridRowsListPath(
  trackerId: string,
  gridSlug: string,
  searchParams: URLSearchParams,
): string {
  const q = searchParams.toString();
  return `/api/trackers/${encodeURIComponent(trackerId)}/grids/${encodeURIComponent(gridSlug)}/rows${q ? `?${q}` : ""}`;
}

export function trackerDataRowPath(trackerId: string, rowId: string): string {
  return `/api/trackers/${encodeURIComponent(trackerId)}/data/${encodeURIComponent(rowId)}`;
}
