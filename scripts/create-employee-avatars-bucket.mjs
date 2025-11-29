/**
 * Скрипт для создания bucket employee-avatars в Supabase Storage
 * Запуск: node scripts/create-employee-avatars-bucket.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Ошибка: Не найдены переменные окружения');
  console.error('   Убедитесь что в .env.local есть:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

const BUCKET_NAME = 'employee-avatars';

async function createBucket() {
  console.log('🚀 Создание bucket для аватаров сотрудников...\n');

  // Проверяем существует ли bucket
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('❌ Ошибка получения списка buckets:', listError.message);
    process.exit(1);
  }

  const existingBucket = buckets.find(b => b.name === BUCKET_NAME);
  
  if (existingBucket) {
    console.log(`✅ Bucket "${BUCKET_NAME}" уже существует`);
    return;
  }

  // Создаём bucket
  const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  });

  if (error) {
    console.error('❌ Ошибка создания bucket:', error.message);
    process.exit(1);
  }

  console.log(`✅ Bucket "${BUCKET_NAME}" успешно создан!`);
  console.log('\n📋 Параметры:');
  console.log('   - Публичный: да');
  console.log('   - Макс. размер файла: 5 МБ');
  console.log('   - Разрешённые типы: JPEG, PNG, GIF, WebP');
}

createBucket().catch(console.error);
