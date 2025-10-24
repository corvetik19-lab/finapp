import { render } from "@react-email/render";
import BudgetAlertEmail from "../lib/email/templates/BudgetAlert";
import LargeTransactionEmail from "../lib/email/templates/LargeTransactionAlert";
import WeeklySummaryEmail from "../lib/email/templates/WeeklySummary";
import fs from "fs";
import path from "path";
import React from "react";

/**
 * Скрипт для генерации HTML-превью всех email-шаблонов
 * Использование: npx tsx scripts/preview-emails.ts
 */

async function generateEmailPreviews() {
  const outputDir = path.join(process.cwd(), "tmp", "email-previews");
  
  // Создаём директорию если её нет
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("📧 Генерация превью email-шаблонов...\n");

  const appUrl = "http://localhost:3000";

  // 1. Budget Alert Email (превышение бюджета)
  const budgetAlertHtml = await render(
    <BudgetAlertEmail
      userName="Мария Петрова"
      categoryName="Кафе и рестораны"
      budgetLimit={15000}
      currentSpent={18600}
      percentage={124}
      appUrl={appUrl}
    />
  );
  
  const budgetAlertPath = path.join(outputDir, "budget-alert.html");
  fs.writeFileSync(budgetAlertPath, budgetAlertHtml, "utf8");
  console.log(`✅ Budget Alert: ${budgetAlertPath}`);

  // 2. Budget Warning Email (предупреждение о бюджете)
  const budgetWarningHtml = await render(
    <BudgetAlertEmail
      userName="Иван Сидоров"
      categoryName="Продукты"
      budgetLimit={30000}
      currentSpent={25500}
      percentage={85}
      appUrl={appUrl}
    />
  );
  
  const budgetWarningPath = path.join(outputDir, "budget-warning.html");
  fs.writeFileSync(budgetWarningPath, budgetWarningHtml, "utf8");
  console.log(`✅ Budget Warning: ${budgetWarningPath}`);

  // 3. Large Transaction Email
  const largeTransactionHtml = await render(
    <LargeTransactionEmail
      userName="Алексей Смирнов"
      categoryName="Путешествия"
      amount={125000}
      averageAmount={35000}
      description="Билеты и отель в Турцию"
      date={new Date().toLocaleDateString("ru-RU")}
      appUrl={appUrl}
    />
  );
  
  const largeTransactionPath = path.join(outputDir, "large-transaction.html");
  fs.writeFileSync(largeTransactionPath, largeTransactionHtml, "utf8");
  console.log(`✅ Large Transaction: ${largeTransactionPath}`);

  // 4. Weekly Summary Email
  const weeklySummaryHtml = await render(
    <WeeklySummaryEmail
      userName="Екатерина Иванова"
      weekStart="15 октября"
      weekEnd="21 октября"
      totalIncome={85000}
      totalExpense={42300}
      balance={42700}
      topCategories={[
        { name: "Продукты", amount: 12500, percentage: 29.5 },
        { name: "Транспорт", amount: 8900, percentage: 21.0 },
        { name: "Развлечения", amount: 7600, percentage: 18.0 },
      ]}
      transactionCount={28}
      appUrl={appUrl}
    />
  );
  
  const weeklySummaryPath = path.join(outputDir, "weekly-summary.html");
  fs.writeFileSync(weeklySummaryPath, weeklySummaryHtml, "utf8");
  console.log(`✅ Weekly Summary: ${weeklySummaryPath}`);

  // Создаём индексный файл для удобного просмотра всех шаблонов
  const indexHtml = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Templates Preview - Finappka</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #1a1a1a;
      margin-bottom: 10px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 40px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }
    .card h2 {
      margin: 0 0 8px 0;
      color: #1a1a1a;
      font-size: 20px;
    }
    .card p {
      margin: 0 0 16px 0;
      color: #666;
      font-size: 14px;
      line-height: 1.5;
    }
    .card a {
      display: inline-block;
      padding: 10px 20px;
      background: #3b82f6;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      transition: background 0.2s;
    }
    .card a:hover {
      background: #2563eb;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      background: #eff6ff;
      color: #3b82f6;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .badge.warning {
      background: #fef3c7;
      color: #f59e0b;
    }
    .badge.danger {
      background: #fee2e2;
      color: #dc2626;
    }
    .badge.success {
      background: #d1fae5;
      color: #10b981;
    }
  </style>
</head>
<body>
  <h1>📧 Email Templates Preview</h1>
  <p class="subtitle">Просмотр всех email-шаблонов проекта Finappka</p>
  
  <div class="grid">
    <div class="card">
      <span class="badge danger">Критично</span>
      <h2>🚨 Превышение бюджета</h2>
      <p>Уведомление при превышении установленного бюджета (≥100%).</p>
      <a href="budget-alert.html" target="_blank">Открыть превью →</a>
    </div>
    
    <div class="card">
      <span class="badge warning">Предупреждение</span>
      <h2>⚠️ Бюджет на исходе</h2>
      <p>Предупреждение при достижении 80-99% бюджета.</p>
      <a href="budget-warning.html" target="_blank">Открыть превью →</a>
    </div>
    
    <div class="card">
      <span class="badge">Аномалия</span>
      <h2>💸 Крупная транзакция</h2>
      <p>Уведомление о необычно крупном расходе (превышает средний в 2+ раза).</p>
      <a href="large-transaction.html" target="_blank">Открыть превью →</a>
    </div>
    
    <div class="card">
      <span class="badge success">Сводка</span>
      <h2>📊 Недельная сводка</h2>
      <p>Еженедельный отчёт о финансовой активности пользователя.</p>
      <a href="weekly-summary.html" target="_blank">Открыть превью →</a>
    </div>
  </div>
  
  <div style="margin-top: 40px; padding: 20px; background: white; border-radius: 12px; border-left: 4px solid #3b82f6;">
    <h3 style="margin: 0 0 8px 0;">💡 Как использовать</h3>
    <ol style="margin: 0; padding-left: 20px; color: #666;">
      <li>Кликните на любую карточку, чтобы открыть превью шаблона</li>
      <li>Проверьте адаптивность, изменяя размер окна браузера</li>
      <li>Тестируйте на разных устройствах (desktop, mobile)</li>
      <li>При необходимости редактируйте файлы в <code>lib/email/templates/</code></li>
    </ol>
  </div>
</body>
</html>
`;

  const indexPath = path.join(outputDir, "index.html");
  fs.writeFileSync(indexPath, indexHtml, "utf8");
  console.log(`✅ Index: ${indexPath}`);

  console.log("\n🎉 Готово! Откройте index.html в браузере:");
  console.log(`\n   file:///${indexPath.replace(/\\/g, "/")}\n`);
}

generateEmailPreviews().catch(console.error);
