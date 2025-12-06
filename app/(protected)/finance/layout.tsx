import FloatingReceiptButton from "@/components/receipts/FloatingReceiptButton";
import { redirect } from "next/navigation";
import { hasUserModeAccess } from "@/lib/platform/organization";
import { FinanceLayout as FinanceLayoutComponent } from "@/components/finance/finance-layout";

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hasAccess = await hasUserModeAccess('finance');
  
  if (!hasAccess) {
    redirect('/dashboard');
  }

  return (
    <FinanceLayoutComponent>
      {children}
      <FloatingReceiptButton />
    </FinanceLayoutComponent>
  );
}
