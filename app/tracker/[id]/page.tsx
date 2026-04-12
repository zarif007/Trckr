import { Suspense } from "react";
import { TrackerByIdPageClient } from "./TrackerByIdPageClient";
import { TrackerPageSkeleton } from "./TrackerPageSkeleton";
import { loadTrackerDataPageResource } from "@/lib/tracker-page/load-tracker-page-resources.server";
import { pickSearchParam } from "@/lib/tracker-page/search-param";
import type { TrackerDataPageResource } from "@/lib/tracker-page/tracker-page-resource-types";

export default async function TrackerByIdPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const instanceId = pickSearchParam(sp.instanceId);
  const initialBranchName = pickSearchParam(sp.branch);
  const conversationIdParam = pickSearchParam(sp.conversationId);

  let initialResource: TrackerDataPageResource | null = null;
  let initialLoadError: Error | null = null;
  try {
    initialResource = await loadTrackerDataPageResource(id, instanceId);
  } catch (e) {
    initialLoadError = e instanceof Error ? e : new Error("FAILED");
  }

  return (
    <Suspense fallback={<TrackerPageSkeleton />}>
      <TrackerByIdPageClient
        id={id}
        instanceId={instanceId}
        initialBranchName={initialBranchName}
        conversationIdParam={conversationIdParam}
        initialResource={initialResource}
        initialLoadError={initialLoadError}
      />
    </Suspense>
  );
}
