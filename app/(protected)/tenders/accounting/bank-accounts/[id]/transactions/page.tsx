import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBankAccount, getBankTransactions } from "@/lib/accounting/bank-service";
import { BankTransactionsPage } from "@/components/accounting/BankTransactionsPage";

export const metadata: Metadata = {
  title: "Выписка по счёту | Бухгалтерия",
  description: "Просмотр банковских транзакций по счёту",
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string; type?: string }>;
}

export default async function BankTransactionsPageRoute({ params, searchParams }: PageProps) {
  const { id } = await params;
  const search = await searchParams;
  
  const account = await getBankAccount(id);
  
  if (!account) {
    notFound();
  }

  const transactions = await getBankTransactions({
    accountId: id,
    dateFrom: search.from,
    dateTo: search.to,
    operationType: search.type as 'credit' | 'debit' | undefined,
  });

  return (
    <BankTransactionsPage 
      account={account}
      transactions={transactions}
    />
  );
}
