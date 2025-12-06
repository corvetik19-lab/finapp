"use client";

import { Settings, Construction } from "lucide-react";

/**
 * N8nManager - управление интеграцией с n8n для автоматизации
 * TODO: Реализовать интеграцию с n8n
 */
export default function N8nManager() {
  return (
    <div className="bg-card rounded-xl border p-6">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Settings className="h-5 w-5" />
          n8n Автоматизация
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Настройка автоматизации финансовых процессов через n8n
        </p>
      </div>

      <div className="flex flex-col items-center py-12 text-center">
        <div className="text-muted-foreground mb-4">
          <Construction className="h-12 w-12" />
        </div>
        <div className="text-xl font-semibold mb-2">Раздел в разработке</div>
        <p className="text-muted-foreground mb-4">
          Интеграция с n8n для автоматизации финансовых процессов будет доступна в следующих версиях.
        </p>
        <p className="text-muted-foreground mb-2">
          Планируемые функции:
        </p>
        <ul className="text-muted-foreground text-sm space-y-1">
          <li>Автоматический импорт транзакций из банков</li>
          <li>Уведомления о превышении бюджета</li>
          <li>Автоматическое создание отчётов</li>
          <li>Интеграция с внешними сервисами</li>
          <li>Webhook для событий приложения</li>
        </ul>
      </div>
    </div>
  );
}
