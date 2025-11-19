"use client";

import { useState, useRef } from 'react';
import styles from './ReceiptsManager.module.css';
import { useRouter } from 'next/navigation';

interface Attachment {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  created_at: string;
  transaction_id: string | null;
}

interface ReceiptsManagerProps {
  initialReceipts: Attachment[];
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

export default function ReceiptsManager({ initialReceipts }: ReceiptsManagerProps) {
  const [receipts, setReceipts] = useState<Attachment[]>(initialReceipts);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const file = selectedFiles[0];

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
      const formData = new FormData();
      formData.append('file', file);
      // Не передаем transactionId, так как это просто загрузка в библиотеку

      const response = await fetch('/api/attachments/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки файла');
      }

      const newReceipt: Attachment = await response.json();
      
      setReceipts(prev => [newReceipt, ...prev]);
      router.refresh();

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
    if (!confirm('Удалить этот чек навсегда?')) return;

    try {
      const response = await fetch('/api/attachments/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, storagePath: filePath }),
      });

      if (!response.ok) {
        throw new Error('Ошибка удаления файла');
      }

      setReceipts(prev => prev.filter(f => f.id !== fileId));
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const handlePreview = (file: Attachment) => {
    if (file.mime_type.startsWith('image/')) {
      const url = `/api/attachments/view?path=${encodeURIComponent(file.file_path)}`;
      setPreviewUrl(url);
    } else {
        // PDF open in new tab
        const url = `/api/attachments/view?path=${encodeURIComponent(file.file_path)}`;
        window.open(url, '_blank');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Мои чеки</h1>
        <div className={styles.uploadWrapper}>
            <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            onChange={handleFileSelect}
            className={styles.fileInput}
            id="receipt-upload"
            disabled={uploading}
            />
            <label htmlFor="receipt-upload" className={styles.uploadButton}>
            {uploading ? (
                <>
                <span className={styles.spinner}></span>
                Загрузка...
                </>
            ) : (
                <>
                <span className="material-icons">add_a_photo</span>
                Загрузить чек
                </>
            )}
            </label>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      {receipts.length === 0 ? (
        <div className={styles.emptyState}>
            <span className="material-icons">receipt_long</span>
            <h3>Нет загруженных чеков</h3>
            <p>Загрузите фото или PDF чеков, чтобы хранить их здесь.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {receipts.map((file) => (
            <div key={file.id} className={styles.card}>
              <div className={styles.cardPreview} onClick={() => handlePreview(file)}>
                {file.mime_type.startsWith('image/') ? (
                   // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={`/api/attachments/view?path=${encodeURIComponent(file.file_path)}`} 
                    alt={file.file_name} 
                    loading="lazy"
                  />
                ) : (
                  <div className={styles.pdfIcon}>
                    <span className="material-icons">picture_as_pdf</span>
                  </div>
                )}
              </div>
              
              <div className={styles.cardInfo}>
                <div className={styles.fileName} title={file.file_name}>{file.file_name}</div>
                <div className={styles.fileMeta}>
                    <span>{formatFileSize(file.file_size)}</span>
                    <span>•</span>
                    <span>{formatDate(file.created_at)}</span>
                </div>
                {file.transaction_id && (
                    <div className={styles.linkedBadge}>
                        <span className="material-icons">link</span>
                        Привязан к транзакции
                    </div>
                )}
              </div>

              <div className={styles.cardActions}>
                 <button
                  className={styles.iconButton}
                  onClick={() => handlePreview(file)}
                  title="Просмотр"
                >
                  <span className="material-icons">visibility</span>
                </button>
                <a
                  href={`/api/attachments/download?path=${encodeURIComponent(file.file_path)}&name=${encodeURIComponent(file.file_name)}`}
                  download
                  className={styles.iconButton}
                  title="Скачать"
                >
                  <span className="material-icons">download</span>
                </a>
                <button
                  className={`${styles.iconButton} ${styles.deleteButton}`}
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
            <img src={previewUrl} alt="Preview" className={styles.modalImage} />
          </div>
        </div>
      )}
    </div>
  );
}
