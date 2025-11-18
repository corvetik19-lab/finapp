'use client';

import { useEffect, useState } from 'react';
import type { TenderAttachment } from '@/lib/tenders/types';

interface TenderAttachmentsProps {
  tenderId: string;
}

export function TenderAttachments({ tenderId }: TenderAttachmentsProps) {
  const [attachments, setAttachments] = useState<TenderAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenderId]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tenders/${tenderId}/attachments`);
      if (!response.ok) {
        throw new Error('Ошибка загрузки вложений');
      }

      const data = await response.json();
      setAttachments(data.data || []);
    } catch (err) {
      console.error('Error loading attachments:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', 'other');

        const response = await fetch(`/api/tenders/${tenderId}/attachments`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Ошибка загрузки файла ${file.name}`);
        }
      }

      await loadAttachments();
      e.target.value = ''; // Reset input
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Ошибка при загрузке файла');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string, fileName: string) => {
    if (!confirm(`Удалить файл "${fileName}"?`)) return;

    try {
      const response = await fetch(
        `/api/tenders/${tenderId}/attachments/${attachmentId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Ошибка удаления файла');
      }

      await loadAttachments();
    } catch (err) {
      console.error('Error deleting attachment:', err);
      alert('Ошибка при удалении файла');
    }
  };

  const handleDownload = async (attachment: TenderAttachment) => {
    try {
      const response = await fetch(
        `/api/tenders/${tenderId}/attachments/${attachment.id}/download`
      );

      if (!response.ok) {
        throw new Error('Ошибка скачивания файла');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading file:', err);
      alert('Ошибка при скачивании файла');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'picture_as_pdf';
      case 'doc':
      case 'docx':
        return 'description';
      case 'xls':
      case 'xlsx':
        return 'table_chart';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      case 'zip':
      case 'rar':
        return 'folder_zip';
      default:
        return 'insert_drive_file';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-2">⚠️ Ошибка</div>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Форма загрузки */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <span className="material-icons text-4xl text-gray-400 mb-2">
              cloud_upload
            </span>
            <p className="mb-2 text-sm text-gray-600">
              <span className="font-semibold">Нажмите для загрузки</span> или
              перетащите файлы
            </p>
            <p className="text-xs text-gray-500">
              PDF, DOC, XLS, изображения (макс. 10 МБ)
            </p>
          </div>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>
        {uploading && (
          <div className="mt-3 text-center text-sm text-blue-600">
            Загрузка файлов...
          </div>
        )}
      </div>

      {/* Список файлов */}
      {attachments.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📎</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Вложений пока нет
          </h3>
          <p className="text-gray-600">
            Загрузите документы, связанные с тендером
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="material-icons text-blue-600 text-2xl">
                    {getFileIcon(attachment.file_name)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">
                    {attachment.file_name}
                  </h4>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span>{formatFileSize(attachment.file_size)}</span>
                    <span>•</span>
                    <span>{formatDate(attachment.created_at)}</span>
                    {attachment.document_type && (
                      <>
                        <span>•</span>
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                          {attachment.document_type}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(attachment)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Скачать"
                  >
                    <span className="material-icons">download</span>
                  </button>
                  <button
                    onClick={() =>
                      handleDelete(attachment.id, attachment.file_name)
                    }
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Удалить"
                  >
                    <span className="material-icons">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
