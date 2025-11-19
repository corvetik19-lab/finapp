import { getDebts } from "@/lib/debts/service";
import { DebtList } from "@/components/debts/DebtList";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Взыскание долгов | Тендеры",
};

export const dynamic = "force-dynamic";

export default async function TenderClaimsPage() {
  const debts = await getDebts();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">⚖️ Взыскание долгов</h1>
            <p className="text-slate-500 mt-1">Реестр задолженностей и претензионная работа</p>
        </div>
      </div>
      
      <DebtList initialDebts={debts} />
    </div>
  );
}
