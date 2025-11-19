import { getDebts } from "@/lib/debts/service";
import { ClaimsManager } from "@/components/debts/ClaimsManager";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Взыскание долгов | Тендеры",
};

export const dynamic = "force-dynamic";

export default async function TenderClaimsPage() {
  const debts = await getDebts();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <ClaimsManager initialDebts={debts} />
    </div>
  );
}
