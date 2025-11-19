"use client";

import { useState, useRef } from 'react';
import styles from './FileUploader.module.css';

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
    <div className={styles.container}>
      {/* Кнопка загрузки */}
      <div className={styles.uploadSection}>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileSelect}
          className={styles.fileInput}
          id="file-upload"
          disabled={uploading}
        />
        <label htmlFor="file-upload" className={styles.uploadButton}>
          {uploading ? (
            <>
              <span className={styles.spinner}></span>
              Загрузка...
            </>
          ) : (
            <>
              <span className="material-icons">attach_file</span>
              Прикрепить файл
            </>
          )}
        </label>
        <span className={styles.uploadHint}>
          Изображения или PDF, до 10 МБ
        </span>
      </div>

      {/* Ошибка */}
      {error && (
        <div className={styles.error}>
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      {/* Список файлов */}
      {files.length > 0 && (
        <div className={styles.filesList}>
          {files.map((file) => (
            <div key={file.id} className={styles.fileItem}>
              <div className={styles.fileIcon}>
                {getFileIcon(file.mime_type)}
              </div>
              
              <div className={styles.fileInfo}>
                <div className={styles.fileName}>{file.file_name}</div>
                <div className={styles.fileSize}>
                  {formatFileSize(file.file_size)}
                </div>
              </div>

              <div className={styles.fileActions}>
                {file.mime_type.startsWith('image/') && (
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => handlePreview(file)}
                    title="Просмотр"
                  >
                    <span className="material-icons">visibility</span>
                  </button>
                )}
                
                <a
                  href={`/api/attachments/download?path=${encodeURIComponent(file.file_path)}&name=${encodeURIComponent(file.file_name)}`}
                  download
                  className={styles.actionButton}
                  title="Скачать"
                >
                  <span className="material-icons">download</span>
                </a>
                
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => handleDelete(file.id, file.file_path)}
                  title="Удалить"
                >
                  <span className="material-icons">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно превью */}
      {previewUrl && (
        <div className={styles.modal} onClick={() => setPreviewUrl(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalClose}
              onClick={() => setPreviewUrl(null)}
            >
              <span className="material-icons">close</span>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Preview" className={styles.previewImage} />
          </div>
        </div>
      )}
    </div>
  );
}
