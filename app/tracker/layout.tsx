import TrackerNavBar from "@/app/components/TrackerNavBar";
import LogLoginEffect from "@/app/components/LogLoginEffect";
import { QueryClientProviderWrapper } from "@/app/dashboard/components/layout/QueryClientProviderWrapper";
import { TrackerNavProvider } from "./TrackerNavContext";

export default function TrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TrackerNavProvider>
      <QueryClientProviderWrapper>
        <LogLoginEffect />
        <TrackerNavBar />
        {children}
      </QueryClientProviderWrapper>
    </TrackerNavProvider>
  );
}
