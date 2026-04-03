"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import {
  projectAreaConfigTileButtonClass,
  projectAreaTileButtonMotion,
} from "./tokens";
import { ProjectFolderTileIcon } from "./ProjectFolderTileIcon";

export function ProjectConfigGridTile({
  icon: Icon,
  label,
  onNavigate,
}: {
  icon: LucideIcon;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <div className="relative flex min-w-0 w-full flex-col items-center gap-3 group/card">
      <motion.button
        type="button"
        {...projectAreaTileButtonMotion}
        onClick={onNavigate}
        className={projectAreaConfigTileButtonClass}
      >
        <ProjectFolderTileIcon icon={Icon} />
        <span className="w-full truncate text-center text-sm font-semibold leading-tight">
          {label}
        </span>
      </motion.button>
    </div>
  );
}
