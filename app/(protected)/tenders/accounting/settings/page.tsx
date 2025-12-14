import { Metadata } from "next";
import { getAccountingSettings } from "@/lib/accounting/service";
import { AccountingSettingsForm } from "@/components/accounting/AccountingSettingsForm";
import { getCurrentCompanyId } from "@/lib/platform/organization";

export const metadata: Metadata = {
  title: "Настройки бухгалтерии | Тендеры",
  description: "Настройки организации и системы налогообложения",
};

export default async function AccountingSettingsPage() {
  const [settings, companyId] = await Promise.all([
    getAccountingSettings(),
    getCurrentCompanyId(),
  ]);

  return (
    <AccountingSettingsForm 
      initialSettings={settings} 
      companyId={companyId || ""} 
    />
  );
}
