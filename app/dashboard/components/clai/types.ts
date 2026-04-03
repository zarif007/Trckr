import type { ReactNode } from "react";

/**
 * CLAI output line types.
 * Extend this union when adding new output kinds (e.g. rich blocks, agent turns).
 */
export type ClaiLineType = "text" | "command" | "error" | "system";

export interface ClaiLine {
  id: string;
  type: ClaiLineType;
  content: string;
  /** Optional timestamp for ordering or display */
  timestamp?: number;
}

/** Default line type for rendering; add cases when extending ClaiLineType */
export type ClaiLineTypeMap = {
  [K in ClaiLineType]: (line: ClaiLine) => ReactNode;
};

/** A single CLAI tab/session with its own history and snapshot of location when created */
export interface ClaiInstance {
  id: string;
  lines: ClaiLine[];
  /** Location (path) when this tab was created or last focused; used for tab label / prompt */
  location: string;
}
