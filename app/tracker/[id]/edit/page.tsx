import { TrackerByIdEditPageClient } from "../TrackerByIdEditPageClient";
import { loadTrackerEditPageResource } from "@/lib/tracker-page/load-tracker-page-resources.server";
import { pickSearchParam } from "@/lib/tracker-page/search-param";
import type { TrackerEditPageResource } from "@/lib/tracker-page/tracker-page-resource-types";

export default async function TrackerEditByIdPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const isNew = pickSearchParam(sp.new) === "true";
  const instanceId = pickSearchParam(sp.instanceId);
  const conversationIdParam = pickSearchParam(sp.conversationId);

  let initialResource: TrackerEditPageResource | null = null;
  let initialLoadError: Error | null = null;
  try {
    initialResource = await loadTrackerEditPageResource(id);
  } catch (e) {
    initialLoadError = e instanceof Error ? e : new Error("FAILED");
  }

  return (
    <TrackerByIdEditPageClient
      id={id}
      isNew={isNew}
      instanceId={instanceId}
      conversationIdParam={conversationIdParam}
      initialResource={initialResource}
      initialLoadError={initialLoadError}
    />
  );
}
