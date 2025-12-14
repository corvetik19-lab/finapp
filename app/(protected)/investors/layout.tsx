import { InvestorsLayout } from "@/components/investors/layout/InvestorsLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <InvestorsLayout>{children}</InvestorsLayout>;
}
