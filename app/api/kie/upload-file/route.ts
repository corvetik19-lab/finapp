import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

const KIE_FILE_UPLOAD_BASE_URL = "https://kieai.redpandaai.co/api";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "KIE_API_KEY не настроен" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Файл не найден" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Неподдерживаемый формат файла. Разрешены: JPG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // Validate file size (max 20MB for Kie.ai)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Файл слишком большой. Максимум 20 МБ" },
        { status: 400 }
      );
    }

    // Create FormData for Kie.ai upload
    const kieFormData = new FormData();
    kieFormData.append("file", file);
    kieFormData.append("uploadPath", `finapp/${user.id}`);
    kieFormData.append("fileName", `${Date.now()}-${file.name}`);

    // Upload to Kie.ai File Stream API
    const response = await fetch(`${KIE_FILE_UPLOAD_BASE_URL}/file-stream-upload`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: kieFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Kie.ai upload error:", errorText);
      return NextResponse.json(
        { error: "Ошибка загрузки файла на Kie.ai" },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log("Kie.ai upload response:", JSON.stringify(data, null, 2));

    if (data.code !== 200 || !data.success) {
      return NextResponse.json(
        { error: data.msg || "Ошибка загрузки файла" },
        { status: 500 }
      );
    }

    // Kie.ai может возвращать URL в разных полях
    const fileUrl = data.data?.fileUrl || data.data?.url || data.data?.file_url || data.data?.downloadUrl;
    
    if (!fileUrl) {
      console.error("No fileUrl in Kie.ai response:", data);
      return NextResponse.json(
        { error: "Kie.ai не вернул URL файла" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: data.data.fileName,
      fileSize: data.data.fileSize,
      mimeType: data.data.mimeType,
    });

  } catch (error) {
    console.error("Upload error:", error);
    
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
