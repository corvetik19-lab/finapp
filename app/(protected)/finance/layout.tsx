import FloatingReceiptButton from "@/components/receipts/FloatingReceiptButton";
import { redirect } from "next/navigation";
import { hasUserModeAccess } from "@/lib/platform/organization";

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
    <>
      {children}
      <FloatingReceiptButton />
    </>
  );
}
