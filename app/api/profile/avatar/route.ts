import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

// POST /api/profile/avatar - загрузка аватара
export async function POST(req: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("avatar") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Проверка размера (макс 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Файл слишком большой" }, { status: 400 });
    }

    // Проверка типа
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Можно загружать только изображения" }, { status: 400 });
    }

    // Генерируем уникальное имя файла
    const fileExt = file.name.split(".").pop();
    const fileName = `avatar.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    // Загружаем в Storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true, // Заменяем старый аватар
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });
    }

    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl;

    // Обновляем метаданные пользователя
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        avatar_url: avatarUrl,
      }
    });

    if (updateError) {
      console.error("Update user error:", updateError);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({ success: true, avatarUrl });
  } catch (error) {
    console.error("POST /api/profile/avatar error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
