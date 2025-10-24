/**
 * Скрипт для автоматической настройки Supabase Storage
 * 
 * Использование:
 * node scripts/setup-storage.js
 * 
 * Требуется:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (из .env.local)
 */

/* eslint-disable @typescript-eslint/no-require-imports */
// Загружаем переменные окружения из .env.local
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Ошибка: Не найдены переменные окружения');
  console.error('Убедитесь что в .env.local есть:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const PROJECT_REF = SUPABASE_URL.split('//')[1].split('.')[0];

console.log('🚀 Настройка Supabase Storage...\n');
console.log(`📦 Проект: ${PROJECT_REF}`);
console.log(`🔗 URL: ${SUPABASE_URL}\n`);

async function createBucket() {
  console.log('1️⃣ Создание bucket "attachments"...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'attachments',
        name: 'attachments',
        public: false,
        file_size_limit: 10485760, // 10 MB
        allowed_mime_types: null,
      }),
    });

    if (response.ok) {
      console.log('   ✅ Bucket создан успешно');
      return true;
    } else if (response.status === 409) {
      console.log('   ℹ️  Bucket уже существует');
      return true;
    } else {
      const error = await response.text();
      console.error('   ❌ Ошибка создания bucket:', error);
      return false;
    }
  } catch (error) {
    console.error('   ❌ Ошибка:', error.message);
    return false;
  }
}

async function createStoragePolicies() {
  console.log('\n2️⃣ Создание RLS политик для Storage...');
  
  const policies = [
    {
      name: 'Users can upload own files',
      operation: 'INSERT',
      definition: `bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text`,
    },
    {
      name: 'Users can view own files',
      operation: 'SELECT',
      definition: `bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text`,
    },
    {
      name: 'Users can update own files',
      operation: 'UPDATE',
      definition: `bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text`,
    },
    {
      name: 'Users can delete own files',
      operation: 'DELETE',
      definition: `bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text`,
    },
  ];

  console.log('   ⚠️  ВНИМАНИЕ: Storage политики нельзя создать через API');
  console.log('   📝 Создайте их вручную в Supabase Dashboard:\n');
  
  policies.forEach((policy, index) => {
    console.log(`   ${index + 1}. ${policy.name}`);
    console.log(`      Operation: ${policy.operation}`);
    console.log(`      Definition: ${policy.definition}\n`);
  });
  
  console.log('   🔗 Откройте: https://supabase.com/dashboard/project/' + PROJECT_REF + '/storage/buckets/attachments');
  console.log('   → Перейдите на вкладку "Policies"');
  console.log('   → Нажмите "New policy" для каждой политики выше\n');
}

async function verifySetup() {
  console.log('3️⃣ Проверка настройки...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket/attachments`, {
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });

    if (response.ok) {
      const bucket = await response.json();
      console.log('   ✅ Bucket найден');
      console.log(`   📊 Публичный: ${bucket.public ? 'Да ❌' : 'Нет ✅'}`);
      console.log(`   📏 Лимит размера: ${(bucket.file_size_limit / 1024 / 1024).toFixed(1)} MB`);
      return true;
    } else {
      console.log('   ❌ Bucket не найден');
      return false;
    }
  } catch (error) {
    console.error('   ❌ Ошибка проверки:', error.message);
    return false;
  }
}

async function main() {
  const bucketCreated = await createBucket();
  
  if (bucketCreated) {
    await createStoragePolicies();
    await verifySetup();
    
    console.log('\n✅ Настройка завершена!');
    console.log('\n📋 Следующие шаги:');
    console.log('   1. Создайте RLS политики вручную (см. выше)');
    console.log('   2. Запустите приложение: npm run dev');
    console.log('   3. Протестируйте загрузку файлов\n');
  } else {
    console.log('\n❌ Настройка не завершена');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});
