"use client";

import { useParams } from "next/navigation";
import { BoardViewClient } from "../_components/BoardViewClient";

export default function BoardViewPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : null;
  if (!id) {
    return (
      <div className="p-6 pt-12 text-sm text-muted-foreground">
        Invalid dashboard.
      </div>
    );
  }
  return <BoardViewClient boardId={id} />;
}
