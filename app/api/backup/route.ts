import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";
import {
  createBackup,
  uploadBackupToStorage,
  listBackups,
  downloadBackupFromStorage,
  restoreFromBackup,
  type BackupData,
} from "@/lib/backup/backup";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes для больших backup'ов

/**
 * GET - получить список backup'ов
 */
export async function GET() {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await listBackups(supabase, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ backups: result.backups || [] });
  } catch (error) {
    console.error("List backups error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST - создать новый backup
 */
export async function POST(request: Request) {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { uploadToStorage = true, downloadLocally = false } = body;

    // Создаём backup
    const backup = await createBackup(supabase, user.id);

    let storagePath: string | undefined;

    // Загружаем в Storage если нужно
    if (uploadToStorage) {
      const uploadResult = await uploadBackupToStorage(
        supabase,
        user.id,
        backup
      );

      if (!uploadResult.success) {
        return NextResponse.json(
          { error: uploadResult.error },
          { status: 500 }
        );
      }

      storagePath = uploadResult.path;
    }

    // Если нужно скачать локально, возвращаем данные
    if (downloadLocally) {
      return NextResponse.json({
        success: true,
        backup,
        storage_path: storagePath,
        message: "Backup created successfully",
      });
    }

    return NextResponse.json({
      success: true,
      storage_path: storagePath,
      metadata: backup.metadata,
      message: "Backup created and uploaded successfully",
    });
  } catch (error) {
    console.error("Create backup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT - восстановить из backup
 */
export async function PUT(request: Request) {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { path, backup: backupData, clearExisting = false } = body;

    let backup: BackupData;

    // Получаем backup из Storage или из тела запроса
    if (path) {
      const downloadResult = await downloadBackupFromStorage(supabase, path);

      if (!downloadResult.success || !downloadResult.backup) {
        return NextResponse.json(
          { error: downloadResult.error || "Failed to download backup" },
          { status: 500 }
        );
      }

      backup = downloadResult.backup;
    } else if (backupData) {
      backup = backupData;
    } else {
      return NextResponse.json(
        { error: "Missing backup data or path" },
        { status: 400 }
      );
    }

    // Восстанавливаем
    const result = await restoreFromBackup(supabase, user.id, backup, {
      clearExisting,
      skipDuplicates: true,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          imported: result.imported,
          errors: result.errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imported: result.imported,
      message: "Data restored successfully",
    });
  } catch (error) {
    console.error("Restore backup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - удалить backup из Storage
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { error: "Missing path parameter" },
        { status: 400 }
      );
    }

    // Проверяем, что путь принадлежит текущему пользователю
    if (!path.startsWith(user.id + "/")) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Удаляем файл из Storage
    const { error } = await supabase.storage
      .from("backups")
      .remove([path]);

    if (error) {
      console.error("Delete backup error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Backup deleted successfully",
    });
  } catch (error) {
    console.error("Delete backup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
