"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import type { TextElement } from "@/lib/boards/board-definition";

export interface BoardBlockTextEditorProps {
  block: TextElement;
  onUpdate: (updater: (el: TextElement) => TextElement) => void;
}

export function BoardBlockTextEditor({
  block,
  onUpdate,
}: BoardBlockTextEditorProps) {
  const [draft, setDraft] = useState(block.content ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(block.content ?? "");
  }, [block.content]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setDraft(val);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        onUpdate((el) => ({ ...el, content: val }));
      }, 300);
    },
    [onUpdate],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Textarea
      value={draft}
      onChange={handleChange}
      placeholder="Type your text here..."
      className="min-h-32 resize-y rounded-sm"
    />
  );
}
