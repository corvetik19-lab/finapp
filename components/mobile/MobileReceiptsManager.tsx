"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import styles from "./MobileReceiptsManager.module.css";

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number | null;
  created_at: string;
}

interface MobileReceiptsManagerProps {
  initialReceipts: Attachment[];
}

export default function MobileReceiptsManager({ initialReceipts }: MobileReceiptsManagerProps) {
  const [receipts, setReceipts] = useState<Attachment[]>(initialReceipts);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
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
        console.log('No user found for Realtime subscription');
        return;
      }

      console.log('Setting up Realtime subscription for user:', user.id);

      const channel = supabase
        .channel('attachments-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'attachments',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('New attachment (Realtime):', payload.new);
            const newAttachment = payload.new as Attachment;
            setReceipts((prev) => {
              // Проверяем что файл еще не добавлен
              if (prev.some(r => r.id === newAttachment.id)) {
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
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Deleted attachment (Realtime):', payload.old);
            const deletedId = (payload.old as { id: string }).id;
            setReceipts((prev) => prev.filter(r => r.id !== deletedId));
          }
        )
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);
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
    const files = e.target.files;
    console.log('Files selected:', files);
    
    if (!files || files.length === 0) {
      console.log('No files selected');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`File ${i}:`, {
          name: file.name,
          size: file.size,
          type: file.type,
        });
        formData.append('files', file);
      }

      console.log('Sending upload request...');
      const response = await fetch('/api/attachments/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (data.success && data.attachments) {
        // Добавляем новые файлы в начало списка
        setReceipts(prev => [...data.attachments, ...prev]);
        
        // Показываем предупреждение если были ошибки
        if (data.errors && data.errors.length > 0) {
          setError(`Некоторые файлы не загружены: ${data.errors.join(', ')}`);
        }
      } else {
        setError(data.error || 'Ошибка загрузки файлов');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Произошла ошибка при загрузке');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string, filePath: string) => {
    if (!confirm('Удалить этот чек?')) return;

    try {
      const response = await fetch('/api/attachments/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: id, storagePath: filePath }),
      });

      const data = await response.json();

      if (data.success) {
        setReceipts(receipts.filter(r => r.id !== id));
      } else {
        alert(data.error || 'Ошибка удаления');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Произошла ошибка при удалении');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📄 Мои чеки</h1>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
          multiple
          capture="environment"
          style={{ display: 'none' }}
        />
        <button
          className={styles.uploadButton}
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? '⏳ Загрузка...' : '📎 Загрузить'}
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      {receipts.length === 0 ? (
        <div className={styles.empty}>
          <span className="material-icons">receipt_long</span>
          <h3>Нет загруженных чеков</h3>
          <p>Нажмите кнопку &quot;Загрузить&quot; чтобы добавить чеки</p>
        </div>
      ) : (
        <div className={styles.list}>
          {receipts.map((receipt) => (
            <div key={receipt.id} className={styles.item}>
              <div className={styles.itemIcon}>
                {receipt.mime_type.startsWith('image/') ? '🖼️' : '📄'}
              </div>
              <div className={styles.itemInfo}>
                <div className={styles.itemName}>{receipt.file_name}</div>
                <div className={styles.itemMeta}>
                  {formatFileSize(receipt.file_size)} • {formatDate(receipt.created_at)}
                </div>
              </div>
              <div className={styles.itemActions}>
                <button
                  onClick={() => {
                    if (receipt.mime_type.startsWith('image/')) {
                      setPreviewImage({
                        url: `/api/attachments/view?path=${encodeURIComponent(receipt.file_path)}`,
                        name: receipt.file_name,
                      });
                    } else {
                      // Для PDF открываем в новой вкладке
                      window.open(`/api/attachments/view?path=${encodeURIComponent(receipt.file_path)}`, '_blank');
                    }
                  }}
                  className={styles.actionButton}
                  title="Просмотр"
                >
                  <span className="material-icons">visibility</span>
                </button>
                <a
                  href={`/api/attachments/download?path=${encodeURIComponent(receipt.file_path)}&name=${encodeURIComponent(receipt.file_name)}`}
                  className={styles.actionButton}
                  title="Скачать"
                >
                  <span className="material-icons">download</span>
                </a>
                <button
                  onClick={() => handleDelete(receipt.id, receipt.file_path)}
                  className={styles.actionButton}
                  title="Удалить"
                >
                  <span className="material-icons">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модалка просмотра изображения */}
      {previewImage && (
        <div className={styles.previewOverlay} onClick={() => setPreviewImage(null)}>
          <div className={styles.previewModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.previewHeader}>
              <h3>{previewImage.name}</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className={styles.closeButton}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>
            <div className={styles.previewBody}>
              <Image
                src={previewImage.url}
                alt={previewImage.name}
                width={800}
                height={600}
                className={styles.previewImage}
                unoptimized
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
