import { getProjectsForUser } from "@/lib/dashboard-data";
import { DashboardLayoutClient } from "./components/layout/DashboardLayoutClient";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialProjects = await getProjectsForUser();
  return (
    <DashboardLayoutClient initialProjects={initialProjects}>
      {children}
    </DashboardLayoutClient>
  );
}
