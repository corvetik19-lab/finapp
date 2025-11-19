"use client";

import { useState, useRef, useEffect } from 'react';
import { createBrowserClient } from "@supabase/ssr";
import styles from './ReceiptsManager.module.css';

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

  // Realtime подписка на изменения в таблице attachments
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Получаем текущего пользователя и подписываемся на изменения
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('❌ [Desktop] No user found for Realtime subscription');
        return;
      }

      console.log('🔄 [Desktop] Setting up Realtime subscription for user:', user.id);

      const channel = supabase
        .channel('attachments-changes-desktop', {
          config: {
            broadcast: { self: true },
          },
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'attachments',
          },
          (payload) => {
            console.log('📥 [Desktop] Realtime INSERT event:', payload);
            const newAttachment = payload.new as Attachment & { user_id: string };
            
            // Фильтруем на клиенте по user_id
            if (newAttachment.user_id !== user.id) {
              console.log('⏭️ [Desktop] Skipping attachment from different user');
              return;
            }
            
            console.log('✅ [Desktop] Adding new attachment:', newAttachment.file_name);
            setReceipts((prev) => {
              // Проверяем что файл еще не добавлен
              if (prev.some(r => r.id === newAttachment.id)) {
                console.log('⚠️ [Desktop] Attachment already exists, skipping');
                return prev;
              }
              return [newAttachment, ...prev];
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'attachments',
          },
          (payload) => {
            console.log('🗑️ [Desktop] Realtime DELETE event:', payload);
            const oldAttachment = payload.old as { id: string; user_id: string };
            
            // Фильтруем на клиенте по user_id
            if (oldAttachment.user_id !== user.id) {
              console.log('⏭️ [Desktop] Skipping delete from different user');
              return;
            }
            
            console.log('✅ [Desktop] Removing attachment:', oldAttachment.id);
            setReceipts((prev) => prev.filter(r => r.id !== oldAttachment.id));
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ [Desktop] Realtime SUBSCRIBED successfully');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ [Desktop] Realtime CHANNEL_ERROR:', err);
          } else if (status === 'TIMED_OUT') {
            console.error('❌ [Desktop] Realtime TIMED_OUT');
          } else if (status === 'CLOSED') {
            console.log('🔌 [Desktop] Realtime CLOSED');
          } else {
            console.log('🔄 [Desktop] Realtime status:', status);
          }
        });

      return channel;
    };

    let channel: ReturnType<typeof supabase.channel> | null = null;

    setupRealtimeSubscription().then((ch) => {
      if (ch) channel = ch;
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

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

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Ошибка загрузки файла');
      }

      // Realtime подписка автоматически добавит файлы в список
      // Но добавим локально для мгновенного отклика
      if (data.attachments && data.attachments.length > 0) {
        setReceipts(prev => {
          const newIds = data.attachments.map((a: Attachment) => a.id);
          const filtered = prev.filter(r => !newIds.includes(r.id));
          return [...data.attachments, ...filtered];
        });
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
    if (!confirm('Удалить этот чек навсегда?')) return;

    try {
      const response = await fetch('/api/attachments/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, storagePath: filePath }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error('Ошибка удаления файла');
      }

      // Realtime подписка автоматически удалит файл из списка
      // Но удалим локально для мгновенного отклика
      setReceipts(prev => prev.filter(f => f.id !== fileId));
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
