/**
 * Применение RLS политик для Storage
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gwqvolspdzhcutvzsdbo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cXZvbHNwZHpoY3V0dnpzZGJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ4MTc3OCwiZXhwIjoyMDc0MDU3Nzc4fQ.lp0SOBefdQBD4fucfBM5NSIvMOMJbS6wNGddIlFMjq8';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'storage' }
});

async function applyPolicies() {
  console.log('🔐 Применение RLS политик для Storage...');
  
  const policies = [
    {
      name: 'Users can upload own files',
      sql: `
        CREATE POLICY IF NOT EXISTS "Users can upload own files"
        ON storage.objects
        FOR INSERT
        TO public
        WITH CHECK (
          bucket_id = 'attachments' 
          AND (storage.foldername(name))[1] = auth.uid()::text
        );
      `
    },
    {
      name: 'Users can view own files',
      sql: `
        CREATE POLICY IF NOT EXISTS "Users can view own files"
        ON storage.objects
        FOR SELECT
        TO public
        USING (
          bucket_id = 'attachments' 
          AND (storage.foldername(name))[1] = auth.uid()::text
        );
      `
    },
    {
      name: 'Users can update own files',
      sql: `
        CREATE POLICY IF NOT EXISTS "Users can update own files"
        ON storage.objects
        FOR UPDATE
        TO public
        USING (
          bucket_id = 'attachments' 
          AND (storage.foldername(name))[1] = auth.uid()::text
        );
      `
    },
    {
      name: 'Users can delete own files',
      sql: `
        CREATE POLICY IF NOT EXISTS "Users can delete own files"
        ON storage.objects
        FOR DELETE
        TO public
        USING (
          bucket_id = 'attachments' 
          AND (storage.foldername(name))[1] = auth.uid()::text
        );
      `
    }
  ];

  for (const policy of policies) {
    console.log(`📝 Применяю политику: ${policy.name}`);
    const { error } = await supabase.rpc('exec_sql', { sql: policy.sql });
    
    if (error) {
      console.error(`❌ Ошибка: ${error.message}`);
    } else {
      console.log(`✅ Политика применена`);
    }
  }
  
  console.log('✅ Все политики применены!');
}

applyPolicies();
