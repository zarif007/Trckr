"use client";

import { usePathname } from "next/navigation";
import NavBar from "./NavBar";

/**
 * Renders the general site NavBar only on routes that don't have their own navbar
 * (e.g. /tracker and /board use TrackerNavBar from their layouts; /analysis has its own header in-page).
 */
export default function NavBarWrapper() {
  const pathname = usePathname();
  const isTrackerPage = pathname?.startsWith("/tracker") ?? false;
  const isBoardPage = pathname?.startsWith("/board") ?? false;
  const isDashboardPage = pathname?.startsWith("/dashboard") ?? false;
  const isProjectPage = pathname?.startsWith("/project") ?? false;
  const isAnalysisPage = pathname?.startsWith("/analysis") ?? false;

  if (
    isTrackerPage ||
    isBoardPage ||
    isDashboardPage ||
    isProjectPage ||
    isAnalysisPage
  ) {
    return null;
  }

  return <NavBar />;
}
