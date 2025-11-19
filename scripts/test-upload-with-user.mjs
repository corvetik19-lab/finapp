/**
 * Тестовая загрузка файла с авторизованным пользователем
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://gwqvolspdzhcutvzsdbo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cXZvbHNwZHpoY3V0dnpzZGJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODE3NzgsImV4cCI6MjA3NDA1Nzc3OH0.XXCh3HpRsyMMwmo6oE7gys4HkJPBLfixpWB87z5r7yA';

// Создаём клиент с anon key (как в приложении)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUploadWithUser() {
  console.log('🔐 Авторизация...');
  
  // Авторизуемся
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'corvetik1@yandex.ru',
    password: 'indigo12'
  });
  
  if (authError) {
    console.error('❌ Ошибка авторизации:', authError);
    return;
  }
  
  console.log('✅ Авторизован как:', authData.user.email);
  console.log('👤 User ID:', authData.user.id);
  
  // Читаем тестовый файл
  const filePath = 'public/icons/icon-192x192.png';
  const fileBuffer = fs.readFileSync(filePath);
  
  // Пробуем загрузить
  const fileName = `${authData.user.id}/receipts/${Date.now()}.png`;
  
  console.log(`\n📤 Загружаем файл: ${fileName}`);
  
  const { data, error } = await supabase.storage
    .from('attachments')
    .upload(fileName, fileBuffer, {
      contentType: 'image/png',
      upsert: false
    });

  if (error) {
    console.error('❌ Ошибка загрузки:', error);
    console.error('Детали:', JSON.stringify(error, null, 2));
    return;
  }

  console.log('✅ Файл успешно загружен!');
  console.log('📦 Данные:', data);
  
  // Пробуем создать запись в БД
  console.log('\n💾 Создаём запись в БД...');
  const { data: dbData, error: dbError } = await supabase
    .from('attachments')
    .insert({
      user_id: authData.user.id,
      transaction_id: null,
      file_name: 'icon-192x192.png',
      file_size: fileBuffer.length,
      mime_type: 'image/png',
      file_path: fileName,
    })
    .select()
    .single();
    
  if (dbError) {
    console.error('❌ Ошибка БД:', dbError);
    return;
  }
  
  console.log('✅ Запись в БД создана!');
  console.log('📦 Данные:', dbData);
}

testUploadWithUser();
