'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './EmployeeDocuments.module.css';

interface Document {
  id: string;
  name: string;
  type: string;
  type_label: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
}

interface EmployeeDocumentsProps {
  employeeId: string;
}

const DOCUMENT_TYPES = [
  { value: 'passport', label: 'Паспорт', icon: '🪪' },
  { value: 'contract', label: 'Договор', icon: '📄' },
  { value: 'certificate', label: 'Сертификат', icon: '📜' },
  { value: 'diploma', label: 'Диплом', icon: '🎓' },
  { value: 'medical', label: 'Медицинская справка', icon: '🏥' },
  { value: 'other', label: 'Другое', icon: '📎' },
];

export function EmployeeDocuments({ employeeId }: EmployeeDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'other',
    notes: '',
    expires_at: ''
  });

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/employees/${employeeId}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Ошибка загрузки документов');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Выберите файл');
      return;
    }

    if (!formData.name) {
      setError('Введите название документа');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const data = new FormData();
      data.append('file', file);
      data.append('name', formData.name);
      data.append('type', formData.type);
      if (formData.notes) data.append('notes', formData.notes);
      if (formData.expires_at) data.append('expires_at', formData.expires_at);

      const response = await fetch(`/api/employees/${employeeId}/documents`, {
        method: 'POST',
        body: data
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Ошибка загрузки');
      }

      const newDoc = await response.json();
      setDocuments([newDoc, ...documents]);
      setShowUploadForm(false);
      setFormData({ name: '', type: 'other', notes: '', expires_at: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Удалить документ?')) return;

    try {
      const response = await fetch(
        `/api/employees/${employeeId}/documents?documentId=${docId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setDocuments(documents.filter(d => d.id !== docId));
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Ошибка удаления');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  const getTypeIcon = (type: string) => {
    return DOCUMENT_TYPES.find(t => t.value === type)?.icon || '📎';
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <span>⏳</span> Загрузка документов...
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>📁 Документы</h4>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className={styles.addButton}
        >
          {showUploadForm ? '✕ Отмена' : '➕ Добавить'}
        </button>
      </div>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      {showUploadForm && (
        <form onSubmit={handleUpload} className={styles.uploadForm}>
          <div className={styles.formRow}>
            <input
              type="text"
              placeholder="Название документа"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={styles.input}
              required
            />
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className={styles.select}
            >
              {DOCUMENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className={styles.formRow}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className={styles.fileInput}
              required
            />
            <input
              type="date"
              placeholder="Срок действия"
              value={formData.expires_at}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              className={styles.dateInput}
            />
          </div>

          <textarea
            placeholder="Примечания (необязательно)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className={styles.textarea}
            rows={2}
          />

          <button
            type="submit"
            disabled={uploading}
            className={styles.submitButton}
          >
            {uploading ? '⏳ Загрузка...' : '📤 Загрузить'}
          </button>
        </form>
      )}

      {documents.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📂</span>
          <p>Документы не загружены</p>
        </div>
      ) : (
        <div className={styles.list}>
          {documents.map((doc) => (
            <div key={doc.id} className={styles.document}>
              <div className={styles.docIcon}>
                {getTypeIcon(doc.type)}
              </div>
              <div className={styles.docInfo}>
                <a 
                  href={doc.file_path} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.docName}
                >
                  {doc.name}
                </a>
                <div className={styles.docMeta}>
                  <span className={styles.docType}>{doc.type_label}</span>
                  <span className={styles.docSize}>{formatFileSize(doc.file_size)}</span>
                  {doc.expires_at && (
                    <span className={styles.docExpires}>
                      до {new Date(doc.expires_at).toLocaleDateString('ru-RU')}
                    </span>
                  )}
                </div>
                {doc.notes && (
                  <div className={styles.docNotes}>{doc.notes}</div>
                )}
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                className={styles.deleteButton}
                title="Удалить"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
