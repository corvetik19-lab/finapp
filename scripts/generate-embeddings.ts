/**
 * Скрипт для генерации embeddings для всех транзакций
 * Запуск: npx tsx scripts/generate-embeddings.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Загружаем переменные окружения из .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { createEmbedding, buildTransactionText } from '../lib/ai/embeddings';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateEmbeddings() {
  console.log('🚀 Начинаем генерацию embeddings...\n');

  // Получаем транзакции без embeddings
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id, note, amount, direction, category_id, categories(name)')
    .is('embedding', null)
    .order('created_at', { ascending: false })
    .limit(100); // Обрабатываем по 100 за раз

  if (error) {
    console.error('❌ Ошибка получения транзакций:', error);
    return;
  }

  if (!transactions || transactions.length === 0) {
    console.log('✅ Все транзакции уже имеют embeddings!');
    return;
  }

  console.log(`📊 Найдено ${transactions.length} транзакций без embeddings\n`);

  let processed = 0;
  let failed = 0;

  for (const txn of transactions) {
    try {
      // Создаем текстовое представление
      const categoryName = Array.isArray(txn.categories) && txn.categories.length > 0
        ? txn.categories[0].name
        : null;

      const text = buildTransactionText({
        description: txn.note || 'Транзакция без описания',
        category: categoryName,
        amount_minor: txn.amount,
        direction: txn.direction as 'income' | 'expense' | 'transfer',
      });

      // Генерируем embedding
      console.log(`⏳ Обработка: ${txn.note?.substring(0, 50) || 'Без описания'}...`);
      const embedding = await createEmbedding(text);

      // Сохраняем в БД
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ embedding })
        .eq('id', txn.id);

      if (updateError) {
        throw updateError;
      }

      processed++;
      console.log(`✅ ${processed}/${transactions.length} - Готово\n`);

      // Небольшая задержка чтобы не перегрузить API
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      failed++;
      console.error(`❌ Ошибка для транзакции ${txn.id}:`, error);
    }
  }

  console.log('\n📈 Результаты:');
  console.log(`✅ Успешно обработано: ${processed}`);
  console.log(`❌ Ошибок: ${failed}`);
  console.log(`📊 Всего: ${transactions.length}`);

  // Получаем общую статистику
  const { data: stats } = await supabase.rpc('get_embedding_stats');
  if (stats && stats.length > 0) {
    console.log('\n📊 Общая статистика embeddings:');
    console.log(`   Всего транзакций: ${stats[0].total_transactions}`);
    console.log(`   С embeddings: ${stats[0].with_embeddings}`);
    console.log(`   Без embeddings: ${stats[0].without_embeddings}`);
    console.log(`   Покрытие: ${stats[0].coverage_percent}%`);
  }
}

generateEmbeddings()
  .then(() => {
    console.log('\n✅ Генерация завершена!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Критическая ошибка:', error);
    process.exit(1);
  });
