"use client";

import { usePathname } from "next/navigation";

const breadcrumbTitles: Record<string, string> = {
  "/tenders/suppliers": "Все поставщики",
  "/tenders/suppliers/categories": "Категории",
  "/tenders/suppliers/compare": "Сравнение",
  "/tenders/suppliers/dashboard": "Аналитика",
  "/tenders/suppliers/map": "Карта",
  "/tenders/suppliers/duplicates": "Дубликаты",
  "/tenders/suppliers/calls": "История звонков",
  "/tenders/suppliers/emails": "Email рассылки",
  "/tenders/suppliers/price-lists": "Прайс-листы",
  "/tenders/suppliers/contracts": "Договоры",
  "/tenders/suppliers/reviews": "Оценки и отзывы",
  "/tenders/suppliers/settings": "Настройки телефонии",
};

export function SuppliersBreadcrumb() {
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
  
  return <>Поставщики</>;
}
