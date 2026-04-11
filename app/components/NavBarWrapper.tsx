"use client";

import { usePathname } from "next/navigation";
import NavBar from "./NavBar";

/**
 * Renders the general site NavBar only on routes that don't have their own navbar
 * (e.g. /tracker and /board use TrackerNavBar from their layouts; /report has its own back link in-page).
 */
export default function NavBarWrapper() {
  const pathname = usePathname();
  const isTrackerPage = pathname?.startsWith("/tracker") ?? false;
  const isBoardPage = pathname?.startsWith("/board") ?? false;
  const isDashboardPage = pathname?.startsWith("/dashboard") ?? false;
  const isProjectPage = pathname?.startsWith("/project") ?? false;
  const isReportPage = pathname?.startsWith("/report") ?? false;
  const isAnalysisPage = pathname?.startsWith("/analysis") ?? false;

  if (
    isTrackerPage ||
    isBoardPage ||
    isDashboardPage ||
    isProjectPage ||
    isReportPage ||
    isAnalysisPage
  ) {
    return null;
  }

  return <NavBar />;
}
