"use client";

import { motion } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrackerInputAreaProps {
  input: string;
  setInput: (v: string) => void;
  isFocused: boolean;
  setIsFocused: (v: boolean) => void;
  handleSubmit: () => void;
  applySuggestion: (s: string) => void;
  isLoading: boolean;
  isChatEmpty: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  variant?: "default" | "hero";
  mode?: "schema" | "data";
}

export function TrackerInputArea({
  input,
  setInput,
  isFocused,
  setIsFocused,
  handleSubmit,
  applySuggestion,
  isLoading,
  isChatEmpty,
  textareaRef,
  variant = "default",
  mode = "schema",
}: TrackerInputAreaProps) {
  const isHero = variant === "hero";
  const isDataMode = mode === "data";
  const placeholder = isDataMode
    ? isChatEmpty
      ? "Ask for a report, summary, or insights on this tracker’s data..."
      : "Ask follow-up questions or new analyses on your data..."
    : isChatEmpty
      ? "Describe your ideal tracker..."
      : "Ask for changes or refinements...";
  return (
    <div className={isHero ? "space-y-4" : "space-y-3"}>
      <div className="relative group">
        <div
          className={`relative overflow-hidden transition-[border-color,box-shadow] duration-200 ${isHero ? "bg-card rounded-sm border border-border/60 " : "bg-background rounded-sm border border-border/50 "} ${isFocused ? "ring-1 ring-foreground/10 border-border/60 " : ""}`}
        >
          <div
            className={`flex items-end gap-2 ${isHero ? "p-3 md:p-4" : "p-2.5 pl-4"}`}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
                if (e.key === "Escape") {
                  setIsFocused(false);
                  textareaRef.current?.blur();
                }
              }}
              placeholder={placeholder}
              rows={1}
              className={`flex-1 bg-transparent resize-none text-foreground placeholder:text-muted-foreground/60 focus:outline-none max-h-[200px] ${isHero ? "text-base min-h-[72px]" : "px-0 py-2 text-sm font-medium min-h-[40px]"}`}
            />

            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              className={`shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${isHero ? "h-12 w-12 rounded-sm" : "h-9 w-9 rounded-sm"} ${
                input.trim() && !isLoading
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isLoading ? (
                <Loader2
                  className={`${isHero ? "w-5 h-5" : "w-4 h-4"} animate-spin`}
                />
              ) : (
                <Send className={`${isHero ? "w-5 h-5" : "w-4 h-4"}`} />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
