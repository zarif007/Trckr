"use client";

import type { RedirectNode } from "@/lib/workflows/types";

interface RedirectConfigProps {
  node: RedirectNode;
  onChange: (node: RedirectNode) => void;
}

export function RedirectConfig({ node, onChange }: RedirectConfigProps) {
  const updateUrl = (value: string) => {
    onChange({
      ...node,
      config: { kind: "url", value },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-foreground/70">
          Redirect URL
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground mb-2">
          Returned only for interactive saves (inline orchestration). First
          redirect wins if multiple are reached.
        </p>
        <input
          type="url"
          value={node.config.value}
          onChange={(e) => updateUrl(e.target.value)}
          placeholder="https://…"
          className="mt-1 w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm focus:border-ring focus:outline-none"
        />
      </div>
    </div>
  );
}
