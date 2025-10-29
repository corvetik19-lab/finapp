/**
 * Скрипт для пересчёта principal_paid для всех существующих кредитов
 * Запуск: npx tsx scripts/recalculate-loans.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Отсутствуют переменные окружения NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function recalculateLoans() {
  console.log('🔄 Начинаем пересчёт кредитов...\n');

  // Получаем все активные кредиты
  const { data: loans, error } = await supabase
    .from('loans')
    .select('id, issue_date, monthly_payment, principal_amount')
    .is('deleted_at', null);

  if (error) {
    console.error('❌ Ошибка при загрузке кредитов:', error);
    process.exit(1);
  }

  if (!loans || loans.length === 0) {
    console.log('ℹ️  Кредиты не найдены');
    return;
  }

  console.log(`📊 Найдено кредитов: ${loans.length}\n`);

  const now = new Date();
  let updated = 0;
  let skipped = 0;

  for (const loan of loans) {
    const issueDate = new Date(loan.issue_date);
    const monthlyPayment = loan.monthly_payment / 100; // Конвертируем из копеек
    const principalAmount = loan.principal_amount;

    // Рассчитываем количество полных месяцев с даты выдачи
    const monthsPassed = (now.getFullYear() - issueDate.getFullYear()) * 12 + (now.getMonth() - issueDate.getMonth());

    let principalPaid = 0;
    if (monthsPassed > 0 && monthlyPayment > 0) {
      // Предполагаем что все платежи были сделаны вовремя
      principalPaid = Math.round(monthlyPayment * monthsPassed * 100);
      
      // Не может быть больше суммы кредита
      principalPaid = Math.min(principalPaid, principalAmount);
    }

    // Обновляем кредит
    const { error: updateError } = await supabase
      .from('loans')
      .update({ principal_paid: principalPaid })
      .eq('id', loan.id);

    if (updateError) {
      console.error(`❌ Ошибка при обновлении кредита ${loan.id}:`, updateError);
      skipped++;
    } else {
      console.log(`✅ Обновлён кредит ${loan.id}: оплачено ${(principalPaid / 100).toFixed(2)} ₽ (${monthsPassed} мес.)`);
      updated++;
    }
  }

  console.log(`\n📈 Результаты:`);
  console.log(`   ✅ Обновлено: ${updated}`);
  console.log(`   ⏭️  Пропущено: ${skipped}`);
  console.log(`\n✨ Готово!`);
}

recalculateLoans().catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});
