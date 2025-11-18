import FloatingReceiptButton from "@/components/receipts/FloatingReceiptButton";

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <FloatingReceiptButton />
    </>
  );
}
