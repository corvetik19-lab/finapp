'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import styles from './AttachmentsList.module.css';

interface Attachment {
  id: string;
  storage_path: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
}

interface AttachmentsListProps {
  transactionId: string;
  onDelete?: (attachmentId: string) => void;
  onViewFile?: (file: {
    fileName: string;
    fileUrl: string;
    mimeType: string | null;
  }) => void;
}

export function AttachmentsList({ transactionId, onDelete, onViewFile }: AttachmentsListProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const supabase = getSupabaseClient();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (mimeType === 'application/pdf') {
      return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const fetchAttachments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('attachments')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setAttachments(data || []);
      
      console.log('fetchAttachments: loaded attachments:', data);
      
      // Генерируем signed URLs для всех файлов
      const urls: Record<string, string> = {};
      for (const attachment of data || []) {
        if (attachment.storage_path) {
          console.log('fetchAttachments: generating URL for attachment:', attachment.id, attachment.storage_path);
          const url = await getSignedUrl(attachment.storage_path);
          urls[attachment.id] = url;
        }
      }
      
      console.log('fetchAttachments: generated URLs:', urls);
      setSignedUrls(urls);
    } catch (err) {
      console.error('Ошибка загрузки вложений:', err);
      setError('Не удалось загрузить вложения');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId, supabase]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const handleDownload = async (attachment: Attachment) => {
    try {
      if (!attachment.storage_path) return;
      
      const { data, error: downloadError } = await supabase.storage
        .from('attachments')
        .download(attachment.storage_path);

      if (downloadError) throw downloadError;

      // Создаём ссылку для скачивания
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.storage_path.split('/').pop() || 'file';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Ошибка скачивания:', err);
      alert('Не удалось скачать файл');
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    const fileName = attachment.storage_path?.split('/').pop() || 'файл';
    if (!confirm(`Удалить ${fileName}?`)) return;

    try {
      // Удаляем из Storage
      if (attachment.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('attachments')
          .remove([attachment.storage_path]);

        if (storageError) throw storageError;
      }

      // Удаляем из БД
      const { error: dbError } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      // Обновляем список
      setAttachments(prev => prev.filter(a => a.id !== attachment.id));

      // Вызываем callback
      if (onDelete) {
        onDelete(attachment.id);
      }
    } catch (err) {
      console.error('Ошибка удаления:', err);
      alert('Не удалось удалить файл');
    }
  };

  const getSignedUrl = async (filePath: string | null): Promise<string> => {
    if (!filePath) {
      console.log('getSignedUrl: filePath is null or empty');
      return '';
    }
    
    console.log('getSignedUrl: generating for path:', filePath);
    
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (error) {
        console.error('Error creating signed URL:', error);
        return '';
      }
      
      console.log('getSignedUrl: success:', data.signedUrl);
      return data.signedUrl;
    } catch (err) {
      console.error('Exception creating signed URL:', err);
      return '';
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>Загрузка вложений...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {error}
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className={styles.empty}>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
        <p>Нет вложений</p>
      </div>
    );
  }

  return (
    <div className={styles.attachmentsList}>
      <h4 className={styles.title}>
        Вложения ({attachments.length})
      </h4>
      
      <div className={styles.grid}>
        {attachments.map((attachment) => {
          const isImage = attachment.mime_type?.startsWith('image/') || false;
          const signedUrl = signedUrls[attachment.id] || '';
          const fileName = attachment.storage_path?.split('/').pop() || 'Файл';

          return (
            <div key={attachment.id} className={styles.attachment}>
              {isImage ? (
                <div className={styles.imagePreview}>
                  {signedUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={signedUrl} alt={fileName} />
                  )}
                </div>
              ) : (
                <div className={styles.filePreview}>
                  {getFileIcon(attachment.mime_type || 'application/octet-stream')}
                </div>
              )}

              <div className={styles.attachmentInfo}>
                <div className={styles.attachmentName} title={fileName}>
                  {fileName}
                </div>
                <div className={styles.attachmentSize}>
                  {formatFileSize(attachment.size_bytes || 0)}
                </div>
              </div>

              <div className={styles.attachmentActions}>
                <button
                  type="button"
                  onClick={() => handleDownload(attachment)}
                  className={styles.downloadButton}
                  title="Скачать"
                >
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>

                {signedUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onViewFile) {
                        onViewFile({
                          fileName,
                          fileUrl: signedUrl,
                          mimeType: attachment.mime_type,
                        });
                      }
                    }}
                    className={styles.viewButton}
                    title="Просмотр"
                  >
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                )}

                {onDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(attachment)}
                    className={styles.deleteButton}
                    title="Удалить"
                  >
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
