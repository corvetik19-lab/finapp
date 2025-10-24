import { Resend } from "resend";
import BudgetAlertEmail from "../lib/email/templates/BudgetAlert";
import React from "react";
import * as dotenv from "dotenv";
import path from "path";

// Загружаем переменные окружения из .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

/**
 * Скрипт для отправки тестового email
 * Использование: npx tsx scripts/send-test-email.ts
 */

async function sendTestEmail() {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  if (!resendApiKey) {
    console.error("❌ Ошибка: RESEND_API_KEY не найден в переменных окружения");
    console.log("\nДобавьте в .env.local:");
    console.log("RESEND_API_KEY=re_...");
    process.exit(1);
  }

  const resend = new Resend(resendApiKey);
  
  // В тестовом режиме Resend отправляет только на email владельца аккаунта
  // Для отправки на другие адреса нужно верифицировать домен
  const testEmail = "corvetik19@gmail.com"; // Email владельца Resend аккаунта
  const ccEmail = "corvetik1@yandex.ru"; // Дополнительный получатель

  console.log("📧 Отправка тестового письма...\n");
  console.log(`От: ${fromEmail}`);
  console.log(`Кому: ${testEmail}`);
  console.log(`Копия: ${ccEmail}`);
  console.log(`Тема: 🚨 Превышение бюджета - Finappka\n`);

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [testEmail, ccEmail],
      subject: "🚨 Превышение бюджета - Finappka",
      react: React.createElement(BudgetAlertEmail, {
        userName: "Тестовый пользователь",
        categoryName: "Кафе и рестораны",
        budgetLimit: 15000,
        currentSpent: 18600,
        percentage: 124,
        appUrl: "http://localhost:3000",
      }),
    });

    if (error) {
      console.error("❌ Ошибка отправки:", error);
      process.exit(1);
    }

    console.log("✅ Письмо успешно отправлено!");
    console.log(`📬 Email ID: ${data?.id}`);
    console.log("\n💡 Проверьте почту (и папку Спам):");
    console.log(`   - ${testEmail}`);
    console.log(`   - ${ccEmail}`);
    console.log("\n🔍 Логи Resend: https://resend.com/emails");
  } catch (err) {
    console.error("❌ Исключение при отправке:", err);
    process.exit(1);
  }
}

sendTestEmail();
