/**
 * Тестовая загрузка файла в Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://gwqvolspdzhcutvzsdbo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cXZvbHNwZHpoY3V0dnpzZGJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MTc3OCwiZXhwIjoyMDc0MDU3Nzc4fQ.lp0SOBefdQBD4fucfBM5NSIvMOMJbS6wNGddIlFMjq8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testUpload() {
  console.log('🧪 Тестирование загрузки файла...');
  
  // Читаем тестовый файл
  const filePath = 'public/icons/icon-192x192.png';
  const fileBuffer = fs.readFileSync(filePath);
  
  // Пробуем загрузить
  const fileName = `test-user-id/receipts/${Date.now()}.png`;
  
  console.log(`📤 Загружаем файл: ${fileName}`);
  
  const { data, error } = await supabase.storage
    .from('attachments')
    .upload(fileName, fileBuffer, {
      contentType: 'image/png',
      upsert: false
    });

  if (error) {
    console.error('❌ Ошибка загрузки:', error);
    return;
  }

  console.log('✅ Файл успешно загружен!');
  console.log('📦 Данные:', data);
  
  // Пробуем получить публичный URL
  const { data: urlData } = supabase.storage
    .from('attachments')
    .getPublicUrl(fileName);
    
  console.log('🔗 URL файла:', urlData.publicUrl);
}

testUpload();
