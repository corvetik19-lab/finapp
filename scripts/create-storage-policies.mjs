/**
 * Создание Storage политик через Supabase Management API
 */

const SUPABASE_ACCESS_TOKEN = 'sbp_0f0aa5bf33352de382a64ae67ba94063fa561eed';
const PROJECT_REF = 'gwqvolspdzhcutvzsdbo';

async function createStoragePolicies() {
  console.log('🔐 Создание Storage политик...');
  
  const policies = [
    {
      name: 'Users can upload own files',
      definition: `(bucket_id = 'attachments'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)`,
      action: 'INSERT',
      check: `(bucket_id = 'attachments'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)`
    },
    {
      name: 'Users can view own files',
      definition: `(bucket_id = 'attachments'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)`,
      action: 'SELECT',
      check: null
    },
    {
      name: 'Users can update own files',
      definition: `(bucket_id = 'attachments'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)`,
      action: 'UPDATE',
      check: null
    },
    {
      name: 'Users can delete own files',
      definition: `(bucket_id = 'attachments'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)`,
      action: 'DELETE',
      check: null
    }
  ];

  for (const policy of policies) {
    console.log(`\n📝 Создаю политику: ${policy.name} (${policy.action})`);
    
    // Формируем SQL для создания политики
    const sql = `
      DROP POLICY IF EXISTS "${policy.name}" ON storage.objects;
      CREATE POLICY "${policy.name}"
      ON storage.objects
      FOR ${policy.action}
      TO public
      ${policy.check ? `WITH CHECK (${policy.check})` : ''}
      ${policy.definition ? `USING (${policy.definition})` : ''};
    `;
    
    try {
      const response = await fetch(
        `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: sql })
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        console.error(`❌ Ошибка: ${result.message || JSON.stringify(result)}`);
      } else {
        console.log(`✅ Политика создана`);
      }
    } catch (error) {
      console.error(`❌ Ошибка запроса:`, error.message);
    }
  }
  
  console.log('\n✅ Готово! Проверьте загрузку чеков.');
}

createStoragePolicies();
