'use client';

import { useState, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, Loader2, AlertCircle, FileText, Eye, Trash2 } from "lucide-react";

interface FileUploadProps {
  transactionId?: string;
  onUploadComplete?: (filePath: string, fileData: {
    name: string;
    size: number;
    type: string;
  }) => void;
  maxSizeMB?: number;
  accept?: string;
  className?: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;
  url: string;
}

export function FileUpload({
  transactionId,
  onUploadComplete,
  maxSizeMB = 10,
  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx',
  className = ''
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = getSupabaseClient();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Проверка размера файла
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`Файл слишком большой. Максимальный размер: ${maxSizeMB}MB`);
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Получаем текущего пользователя
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Необходима авторизация');
      }

      // Генерируем безопасное имя файла (без кириллицы)
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || 'file';
      const safeFileName = `${user.id}/${timestamp}.${fileExtension}`;

      // Загружаем файл
      const { data, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(safeFileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setProgress(100);

      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(data.path);

      const uploadedFile: UploadedFile = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        path: data.path,
        url: urlData.publicUrl
      };

      setUploadedFiles(prev => [...prev, uploadedFile]);

      // Callback для родительского компонента
      if (onUploadComplete) {
        onUploadComplete(data.path, {
          name: file.name,
          size: file.size,
          type: file.type
        });
      }

      // Если есть ID транзакции, сохраняем в БД
      if (transactionId) {
        const { error: dbError } = await supabase
          .from('attachments')
          .insert({
            transaction_id: transactionId,
            user_id: user.id,
            storage_path: data.path,
            size_bytes: file.size,
            mime_type: file.type
          });

        if (dbError) {
          console.error('Ошибка сохранения в БД:', dbError);
        }
      }

    } catch (err) {
      console.error('Ошибка загрузки:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки файла');
    } finally {
      setUploading(false);
      setProgress(0);
      
      // Очищаем input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (file: UploadedFile) => {
    try {
      // Удаляем из Storage
      const { error: storageError } = await supabase.storage
        .from('attachments')
        .remove([file.path]);

      if (storageError) throw storageError;

      // Удаляем из БД если есть transaction_id
      if (transactionId) {
        await supabase
          .from('attachments')
          .delete()
          .eq('file_path', file.path);
      }

      // Удаляем из списка
      setUploadedFiles(prev => prev.filter(f => f.id !== file.id));

    } catch (err) {
      console.error('Ошибка удаления:', err);
      setError('Ошибка удаления файла');
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
        <input ref={fileInputRef} type="file" id="file-upload" className="hidden" accept={accept} onChange={handleFileSelect} disabled={uploading} />
        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
          {uploading ? (<><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><span className="text-sm">Загрузка... {progress}%</span></>) : (<><Upload className="h-8 w-8 text-muted-foreground" /><span className="text-sm font-medium">Нажмите для выбора файла</span><span className="text-xs text-muted-foreground">Максимальный размер: {maxSizeMB}MB</span></>)}
        </label>
      </div>
      {error && <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{error}</div>}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Загруженные файлы:</h4>
          {uploadedFiles.map(file => (
            <div key={file.id} className="flex items-center justify-between p-2 border rounded-lg">
              <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-muted-foreground" /><div><div className="text-sm font-medium truncate max-w-[200px]">{file.name}</div><div className="text-xs text-muted-foreground">{formatFileSize(file.size)}</div></div></div>
              <div className="flex gap-1"><Button variant="ghost" size="sm" asChild><a href={file.url} target="_blank" rel="noopener noreferrer" title="Просмотр"><Eye className="h-4 w-4" /></a></Button><Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(file)} title="Удалить"><Trash2 className="h-4 w-4" /></Button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
