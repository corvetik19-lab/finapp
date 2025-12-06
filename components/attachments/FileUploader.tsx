"use client";

import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Paperclip, Loader2, AlertCircle, Eye, Download, Trash2, X } from "lucide-react";

interface FileUploaderProps {
  transactionId: string;
  existingFiles?: Attachment[];
  onUploadComplete?: (file: Attachment) => void;
  onDeleteComplete?: (fileId: string) => void;
}

interface Attachment {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  created_at: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

export default function FileUploader({
  transactionId,
  existingFiles = [],
  onUploadComplete,
  onDeleteComplete,
}: FileUploaderProps) {
  const [files, setFiles] = useState<Attachment[]>(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const file = selectedFiles[0]; // Пока загружаем по одному файлу

    // Валидация размера
    if (file.size > MAX_FILE_SIZE) {
      setError('Файл слишком большой. Максимум 10 МБ');
      return;
    }

    // Валидация типа
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Неподдерживаемый тип файла. Разрешены: изображения и PDF');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Создаём FormData для отправки
      const formData = new FormData();
      formData.append('file', file);
      formData.append('transactionId', transactionId);

      // Отправляем на сервер
      const response = await fetch('/api/attachments/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки файла');
      }

      const attachment: Attachment = await response.json();
      
      setFiles(prev => [...prev, attachment]);
      
      if (onUploadComplete) {
        onUploadComplete(attachment);
      }

      // Очищаем input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: string, filePath: string) => {
    if (!confirm('Удалить этот файл?')) return;

    try {
      const response = await fetch('/api/attachments/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, storagePath: filePath }),
      });

      if (!response.ok) {
        throw new Error('Ошибка удаления файла');
      }

      setFiles(prev => prev.filter(f => f.id !== fileId));
      
      if (onDeleteComplete) {
        onDeleteComplete(fileId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const handlePreview = (file: Attachment) => {
    // Для изображений показываем превью
    if (file.mime_type.startsWith('image/')) {
      const url = `/api/attachments/view?path=${encodeURIComponent(file.file_path)}`;
      setPreviewUrl(url);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    return '📎';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input ref={fileInputRef} type="file" accept={ALLOWED_TYPES.join(',')} onChange={handleFileSelect} className="hidden" id="file-upload" disabled={uploading} />
        <Button variant="outline" asChild disabled={uploading}>
          <label htmlFor="file-upload" className="cursor-pointer">{uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Загрузка...</> : <><Paperclip className="h-4 w-4 mr-2" />Прикрепить файл</>}</label>
        </Button>
        <span className="text-sm text-muted-foreground">Изображения или PDF, до 10 МБ</span>
      </div>

      {error && <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{error}</div>}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <Card key={file.id}>
              <CardContent className="flex items-center gap-3 py-3">
                <span className="text-2xl">{getFileIcon(file.mime_type)}</span>
                <div className="flex-1 min-w-0"><div className="font-medium text-sm truncate">{file.file_name}</div><div className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</div></div>
                <div className="flex items-center gap-1">
                  {file.mime_type.startsWith('image/') && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(file)}><Eye className="h-4 w-4" /></Button>}
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild><a href={`/api/attachments/download?path=${encodeURIComponent(file.file_path)}&name=${encodeURIComponent(file.file_name)}`} download><Download className="h-4 w-4" /></a></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(file.id, file.file_path)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setPreviewUrl(null)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="absolute -top-10 right-0 text-white" onClick={() => setPreviewUrl(null)}><X className="h-6 w-6" /></Button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-[90vh] rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
