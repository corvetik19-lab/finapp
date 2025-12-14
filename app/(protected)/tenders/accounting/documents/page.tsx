import { Metadata } from "next";
import { getDocuments } from "@/lib/accounting/service";
import { DocumentsList } from "@/components/accounting/DocumentsList";

export const metadata: Metadata = {
  title: "Документы | Бухгалтерия",
  description: "Счета, акты, накладные и другие документы",
};

export default async function DocumentsPage() {
  const documents = await getDocuments();

  return <DocumentsList documents={documents} />;
}
