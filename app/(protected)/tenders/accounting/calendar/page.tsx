import { Metadata } from "next";
import { getPaymentCalendar } from "@/lib/accounting/reports";
import { PaymentCalendar } from "@/components/accounting/reports/PaymentCalendar";

export const metadata: Metadata = {
  title: "Платёжный календарь | Бухгалтерия",
  description: "Прогноз поступлений и платежей",
};

interface PageProps {
  searchParams: Promise<{ start?: string; end?: string }>;
}

export default async function PaymentCalendarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  
  const today = new Date();
  const defaultStart = today.toISOString().split('T')[0];
  const defaultEnd = new Date(today.getFullYear(), today.getMonth() + 3, 0)
    .toISOString().split('T')[0];
  
  const startDate = params.start || defaultStart;
  const endDate = params.end || defaultEnd;
  
  const report = await getPaymentCalendar(startDate, endDate);

  return (
    <PaymentCalendar 
      report={report} 
      startDate={startDate}
      endDate={endDate}
    />
  );
}
