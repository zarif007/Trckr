"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { BoardEditClient } from "../../_components/BoardEditClient";

function BoardEditInner() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : null;
  if (!id) {
    return (
      <div className="p-6 pt-12 text-sm text-muted-foreground">
        Invalid dashboard.
      </div>
    );
  }
  return <BoardEditClient boardId={id} />;
}

export default function BoardEditPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 pt-12 text-sm text-muted-foreground">Loading…</div>
      }
    >
      <BoardEditInner />
    </Suspense>
  );
}
