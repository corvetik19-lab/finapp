#!/usr/bin/env node
/**
 * Скрипт для применения миграции создания автоматических платежей по кредитам
 * Запуск: node scripts/apply-loan-payments-migration.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Получаем путь к текущей директории
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Читаем переменные окружения
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Ошибка: не найдены переменные окружения NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY');
  console.log('Убедитесь, что файл .env.local содержит эти переменные');
  process.exit(1);
}

// Создаём клиент Supabase
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('📄 Чтение миграции...');
    
    // Читаем SQL файл
    const migrationPath = join(__dirname, '..', 'db', 'migrations', '20251005_auto_create_loan_payments.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    console.log('🚀 Применение миграции...');
    
    // Выполняем SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Если функция exec_sql не существует, попробуем другой способ
      console.log('⚠️  Функция exec_sql не найдена. Используйте Supabase Dashboard → SQL Editor');
      console.log('\n📋 Скопируйте содержимое файла:');
      console.log('   db/migrations/20251005_auto_create_loan_payments.sql');
      console.log('\n🌐 И выполните в: https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
      console.log('\n📝 Содержимое миграции:');
      console.log('─'.repeat(80));
      console.log(sql);
      console.log('─'.repeat(80));
      return;
    }
    
    console.log('✅ Миграция успешно применена!');
    console.log('\n🧪 Тестовый запуск функции...');
    
    // Тестируем функцию
    const { data: testData, error: testError } = await supabase.rpc('auto_create_loan_payments');
    
    if (testError) {
      console.error('❌ Ошибка при тестировании:', testError.message);
    } else {
      console.log('✅ Функция работает!');
      console.log(`📊 Результат: создано платежей - ${testData?.[0]?.created_count ?? 0}`);
      console.log(`💬 Сообщение: ${testData?.[0]?.message ?? 'OK'}`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

console.log('🔧 Применение миграции автоматических платежей по кредитам\n');
applyMigration();
