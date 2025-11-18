'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Tender } from '@/lib/tenders/types';
import { useToast } from '@/components/toast/ToastContext';
import styles from './tender-files-tab.module.css';

type FileCategory = 'tender' | 'calculation' | 'submission' | 'contract';

interface TenderFile {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  category: FileCategory;
  comment?: string;
  created_at: string;
  uploader_id?: string;
  uploader_name?: string;
}

interface TenderFilesTabProps {
  tender: Tender;
}

export function TenderFilesTab({ tender }: TenderFilesTabProps) {
  const [files, setFiles] = useState<TenderFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('tender');
  const [commentingFileId, setCommentingFileId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [viewingFile, setViewingFile] = useState<TenderFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tenders/${tender.id}/files`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  }, [tender.id]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const categoryLabels: Record<FileCategory, string> = {
    tender: 'Файлы тендера',
    calculation: 'Файлы просчета',
    submission: 'Файлы на подачу',
    contract: 'Контракт',
  };

  const filteredFiles = files.filter(f => f.category === selectedCategory);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      uploadFiles(Array.from(selectedFiles));
    }
  };

  const uploadFiles = async (filesToUpload: File[]) => {
    try {
      setUploading(true);
      
      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', selectedCategory);
        
        const response = await fetch(`/api/tenders/${tender.id}/files`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Upload error response:', errorData);
          throw new Error(`Ошибка загрузки файла ${file.name}: ${errorData.error || 'Unknown error'}`);
        }
      }
      
      await loadFiles();
      toast.show('Файлы успешно загружены', { type: 'success' });
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.show(error instanceof Error ? error.message : 'Ошибка при загрузке файлов', { type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: TenderFile) => {
    try {
      const response = await fetch(`/api/tenders/${tender.id}/files/${file.id}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.file_name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Удалить файл?')) return;
    
    try {
      const response = await fetch(`/api/tenders/${tender.id}/files/${fileId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await loadFiles();
        toast.show('Файл удалён', { type: 'success' });
      } else {
        toast.show('Ошибка при удалении файла', { type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.show('Ошибка при удалении файла', { type: 'error' });
    }
  };

  const handleAddComment = async (fileId: string) => {
    if (!commentText.trim()) return;

    try {
      const response = await fetch(`/api/tenders/${tender.id}/files/${fileId}/comment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: commentText }),
      });

      if (response.ok) {
        await loadFiles();
        setCommentingFileId(null);
        setCommentText('');
        toast.show('Комментарий добавлен', { type: 'success' });
      } else {
        const errorData = await response.json();
        console.error('Comment error response:', errorData);
        toast.show(`Ошибка: ${errorData.error || 'Unknown error'}`, { type: 'error' });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.show('Ошибка при добавлении комментария', { type: 'error' });
    }
  };

  const getFileExtension = (fileName: string) => {
    const parts = fileName.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  };

  const getFileIcon = (fileName: string) => {
    const ext = getFileExtension(fileName).toLowerCase();
    if (['.doc', '.docx'].includes(ext)) return '📝';
    if (['.xls', '.xlsx'].includes(ext)) return '📊';
    if (['.pdf'].includes(ext)) return '📄';
    if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) return '🖼️';
    if (['.zip', '.rar', '.7z'].includes(ext)) return '📦';
    return '📎';
  };

  if (loading) {
    return <div className={styles.container}>Загрузка файлов...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Вкладки категорий */}
      <div className={styles.categoryTabs}>
        {(Object.keys(categoryLabels) as FileCategory[]).map((category) => (
          <button
            key={category}
            className={`${styles.categoryTab} ${selectedCategory === category ? styles.categoryTabActive : ''}`}
            onClick={() => setSelectedCategory(category)}
          >
            {categoryLabels[category]}
          </button>
        ))}
      </div>

      {/* Кнопка загрузки */}
      <div className={styles.toolbar}>
        <button 
          className={styles.uploadButton} 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Загрузка...' : 'Загрузить файл'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* Таблица файлов */}
      {filteredFiles.length === 0 ? (
        <div className={styles.emptyState}>
          <p>📂 Файлов в этой категории пока нет</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.filesTable}>
            <thead>
              <tr>
                <th>Файл</th>
                <th>Расширение</th>
                <th>Дата и время прикрепления</th>
                {selectedCategory !== 'tender' && <th>Кто прикрепил</th>}
                <th>Комментарий</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => (
                <tr key={file.id}>
                  <td className={styles.fileNameCell}>{file.file_name}</td>
                  <td className={styles.extensionCell}>
                    <span className={styles.fileIcon}>{getFileIcon(file.file_name)}</span>
                    <span>{getFileExtension(file.file_name)}</span>
                  </td>
                  <td>{new Date(file.created_at).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}</td>
                  {selectedCategory !== 'tender' && (
                    <td>
                      {file.uploader_name ? (
                        <div className={styles.uploaderCell}>
                          <span className={styles.uploaderIcon}>👤</span>
                          <span>{file.uploader_name}</span>
                        </div>
                      ) : (
                        <span className={styles.systemUpload}>Неизвестный сотрудник</span>
                      )}
                    </td>
                  )}
                  <td>
                    {commentingFileId === file.id ? (
                      <div className={styles.commentForm}>
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Введите комментарий..."
                          className={styles.commentInput}
                          autoFocus
                        />
                        <button
                          onClick={() => handleAddComment(file.id)}
                          className={styles.commentSaveButton}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => {
                            setCommentingFileId(null);
                            setCommentText('');
                          }}
                          className={styles.commentCancelButton}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setCommentingFileId(file.id);
                          setCommentText(file.comment || '');
                        }}
                        className={styles.addCommentButton}
                      >
                        {file.comment || 'Добавить комментарий'}
                      </button>
                    )}
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        onClick={() => setViewingFile(file)}
                        className={styles.viewButton}
                        title="Просмотр"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => handleDownload(file)}
                        className={styles.downloadButton}
                        title="Скачать"
                      >
                        ⬇️
                      </button>
                      <button
                        onClick={() => handleDelete(file.id)}
                        className={styles.deleteButton}
                        title="Удалить"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Модалка просмотра файла */}
      {viewingFile && (
        <div className={styles.modal} onClick={() => setViewingFile(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{viewingFile.file_name}</h3>
              <button
                onClick={() => setViewingFile(null)}
                className={styles.modalCloseButton}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <iframe
                src={`/api/tenders/${tender.id}/files/${viewingFile.id}/view`}
                className={styles.fileViewer}
                title={viewingFile.file_name}
              />
            </div>
            <div className={styles.modalFooter}>
              <button
                onClick={() => handleDownload(viewingFile)}
                className={styles.modalDownloadButton}
              >
                ⬇️ Скачать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
