"use client";

import dynamic from "next/dynamic";
import { DashboardHomeSkeleton } from "../components/skeleton/DashboardPageSkeleton";

const DashboardPageContent = dynamic(
  () =>
    import("../DashboardPageContent").then((m) => ({
      default: m.DashboardPageContent,
    })),
  {
    loading: () => <DashboardHomeSkeleton />,
  },
);

export default function DashboardProjectsPage() {
  return <DashboardPageContent view="projects" />;
}
