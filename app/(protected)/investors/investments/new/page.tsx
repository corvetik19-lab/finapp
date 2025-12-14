import { getActiveSource, generateInvestmentNumber } from "@/lib/investors/service";
import { NewInvestmentPage } from "@/components/investors/NewInvestmentPage";

export default async function Page() {
  const [sources, investmentNumber] = await Promise.all([
    getActiveSource(),
    generateInvestmentNumber(),
  ]);
  
  // TODO: получить список тендеров
  const tenders: { id: string; name: string; registry_number: string; contract_amount: number }[] = [];

  return (
    <NewInvestmentPage
      sources={sources}
      tenders={tenders}
      defaultNumber={investmentNumber}
    />
  );
}
