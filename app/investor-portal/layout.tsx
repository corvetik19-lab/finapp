import { InvestorPortalLayout } from "@/components/investors/portal/InvestorPortalLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <InvestorPortalLayout>{children}</InvestorPortalLayout>;
}
