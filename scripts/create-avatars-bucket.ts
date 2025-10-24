import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

// Загружаем переменные окружения
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Ошибка: Не найдены SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAvatarsBucket() {
  console.log("🪣 Создание bucket 'avatars' для аватаров пользователей...\n");

  // 1. Создаём bucket
  const { error: bucketError } = await supabase.storage.createBucket("avatars", {
    public: true, // Публичный доступ для чтения
    fileSizeLimit: 2097152, // 2MB
    allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"],
  });

  if (bucketError) {
    if (bucketError.message.includes("already exists")) {
      console.log("ℹ️  Bucket 'avatars' уже существует");
    } else {
      console.error("❌ Ошибка создания bucket:", bucketError);
      process.exit(1);
    }
  } else {
    console.log("✅ Bucket 'avatars' успешно создан");
  }

  // 2. Создаём RLS политики
  console.log("\n📝 Создание RLS политик...\n");

  const policies = [
    {
      name: "Users can upload their own avatar",
      sql: `
        CREATE POLICY "Users can upload their own avatar"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
          bucket_id = 'avatars' AND
          (storage.foldername(name))[1] = auth.uid()::text
        );
      `,
    },
    {
      name: "Users can update their own avatar",
      sql: `
        CREATE POLICY "Users can update their own avatar"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (
          bucket_id = 'avatars' AND
          (storage.foldername(name))[1] = auth.uid()::text
        );
      `,
    },
    {
      name: "Users can delete their own avatar",
      sql: `
        CREATE POLICY "Users can delete their own avatar"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (
          bucket_id = 'avatars' AND
          (storage.foldername(name))[1] = auth.uid()::text
        );
      `,
    },
    {
      name: "Anyone can view avatars",
      sql: `
        CREATE POLICY "Anyone can view avatars"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'avatars');
      `,
    },
  ];

  for (const policy of policies) {
    try {
      const { error } = await supabase.rpc("exec_sql", {
        sql_query: policy.sql,
      });

      if (error) {
        if (error.message && error.message.includes("already exists")) {
          console.log(`   ℹ️  Политика "${policy.name}" уже существует`);
        } else {
          console.error(`   ❌ Ошибка создания политики "${policy.name}":`, error.message);
        }
      } else {
        console.log(`   ✅ Политика "${policy.name}" создана`);
      }
    } catch (err) {
      console.error(`   ❌ Исключение при создании политики "${policy.name}":`, err);
    }
  }

  console.log("\n🎉 Готово! Bucket 'avatars' настроен и готов к использованию");
  console.log("\n💡 Теперь пользователи могут загружать аватары в профиле");
}

createAvatarsBucket();
