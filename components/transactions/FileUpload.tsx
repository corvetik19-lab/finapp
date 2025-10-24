'use client';

import { useState, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import styles from './FileUpload.module.css';

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
    <div className={`${styles.fileUpload} ${className}`}>
      <div className={styles.uploadArea}>
        <input
          ref={fileInputRef}
          type="file"
          id="file-upload"
          className={styles.fileInput}
          accept={accept}
          onChange={handleFileSelect}
          disabled={uploading}
        />
        
        <label htmlFor="file-upload" className={styles.uploadLabel}>
          {uploading ? (
            <div className={styles.uploadingState}>
              <div className={styles.spinner} />
              <span>Загрузка... {progress}%</span>
            </div>
          ) : (
            <>
              <svg className={styles.uploadIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className={styles.uploadText}>
                Нажмите для выбора файла
              </span>
              <span className={styles.uploadHint}>
                Максимальный размер: {maxSizeMB}MB
              </span>
            </>
          )}
        </label>
      </div>

      {error && (
        <div className={styles.error}>
          <svg className={styles.errorIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className={styles.fileList}>
          <h4>Загруженные файлы:</h4>
          {uploadedFiles.map(file => (
            <div key={file.id} className={styles.fileItem}>
              <div className={styles.fileInfo}>
                <svg className={styles.fileIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <div className={styles.fileName}>{file.name}</div>
                  <div className={styles.fileSize}>{formatFileSize(file.size)}</div>
                </div>
              </div>
              <div className={styles.fileActions}>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.viewButton}
                  title="Просмотреть"
                >
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </a>
                <button
                  onClick={() => handleDelete(file)}
                  className={styles.deleteButton}
                  title="Удалить"
                >
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
