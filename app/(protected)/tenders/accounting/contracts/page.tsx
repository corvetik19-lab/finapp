import { Metadata } from "next";
import { getContractTemplates, getGeneratedContracts, initializeSystemTemplates } from "@/lib/accounting/documents/contract-templates";
import { getCounterparties } from "@/lib/accounting/service";
import { ContractTemplatesPage } from "@/components/accounting/documents/ContractTemplatesPage";

export const metadata: Metadata = {
  title: "Шаблоны договоров | Бухгалтерия",
  description: "Конструктор договоров",
};

export default async function ContractTemplatesRoute() {
  // Инициализируем системные шаблоны при первом посещении
  await initializeSystemTemplates();
  
  const [templates, contracts, counterparties] = await Promise.all([
    getContractTemplates(),
    getGeneratedContracts(),
    getCounterparties(),
  ]);

  return (
    <ContractTemplatesPage 
      templates={templates}
      contracts={contracts}
      counterparties={counterparties}
    />
  );
}
