"use client";

import { usePathname } from "next/navigation";

const breadcrumbTitles: Record<string, string> = {
  "/tenders/accounting": "Дашборд",
  "/tenders/accounting/documents": "Документы",
  "/tenders/accounting/counterparties": "Контрагенты",
  "/tenders/accounting/bank-accounts": "Банковские счета",
  "/tenders/accounting/bank-integrations": "Банк-интеграции",
  "/tenders/accounting/taxes": "Налоги",
  "/tenders/accounting/taxes/calendar": "Календарь налогов",
  "/tenders/accounting/taxes/calculators": "Калькуляторы",
  "/tenders/accounting/kudir": "КУДиР",
  "/tenders/accounting/reports": "Отчёты",
  "/tenders/accounting/settings": "Настройки",
};

export function AccountingBreadcrumb() {
  const pathname = usePathname();
  
  // Проверяем точное совпадение
  if (breadcrumbTitles[pathname]) {
    return <>{breadcrumbTitles[pathname]}</>;
  }
  
  // Проверяем по началу пути
  for (const [path, title] of Object.entries(breadcrumbTitles)) {
    if (pathname.startsWith(path + "/")) {
      return <>{title}</>;
    }
  }
  
  return <>Бухгалтерия</>;
}
