/**
 * Применение миграции для создания bucket attachments
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gwqvolspdzhcutvzsdbo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cXZvbHNwZHpoY3V0dnpzZGJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MTc3OCwiZXhwIjoyMDc0MDU3Nzc4fQ.lp0SOBefdQBD4fucfBM5NSIvMOMJbS6wNGddIlFMjq8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBucket() {
  console.log('🚀 Создание bucket attachments...');
  
  // Создаём bucket
  const { data, error } = await supabase.storage.createBucket('attachments', {
    public: false,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf'
    ]
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Bucket attachments уже существует');
      return;
    }
    console.error('❌ Ошибка создания bucket:', error);
    process.exit(1);
  }

  console.log('✅ Bucket attachments успешно создан!');
  console.log('📦 Данные:', data);
}

createBucket();
