'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import { Loader2, Download, Eye, Trash2, Paperclip, FileText, AlertCircle } from "lucide-react";

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
      
      // console.log('fetchAttachments: loaded attachments:', data);
      
      // Генерируем signed URLs для всех файлов
      const urls: Record<string, string> = {};
      for (const attachment of data || []) {
        if (attachment.storage_path) {
          // console.log('fetchAttachments: generating URL for attachment:', attachment.id, attachment.storage_path);
          const url = await getSignedUrl(attachment.storage_path);
          urls[attachment.id] = url;
        }
      }
      
      // console.log('fetchAttachments: generated URLs:', urls);
      setSignedUrls(urls);
    } catch {
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
    } catch {
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
    } catch {
      alert('Не удалось удалить файл');
    }
  };

  const getSignedUrl = async (filePath: string | null): Promise<string> => {
    if (!filePath) {
      return '';
    }
    
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (error) {
        return '';
      }
      
      return data.signedUrl;
    } catch {
      return '';
    }
  };

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Загрузка...</div>;
  if (error) return <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{error}</div>;
  if (attachments.length === 0) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Paperclip className="h-4 w-4" />Нет вложений</div>;

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">Вложения ({attachments.length})</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {attachments.map((attachment) => {
          const isImage = attachment.mime_type?.startsWith('image/') || false;
          const signedUrl = signedUrls[attachment.id] || '';
          const fileName = attachment.storage_path?.split('/').pop() || 'Файл';
          return (
            <div key={attachment.id} className="border rounded-lg p-2 space-y-2">
              {isImage ? (
                <div className="aspect-video bg-muted rounded overflow-hidden">
                  {signedUrl && <Image src={signedUrl} alt={fileName} fill className="object-cover" />}
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded flex items-center justify-center"><FileText className="h-8 w-8 text-muted-foreground" /></div>
              )}
              <div><div className="text-xs font-medium truncate" title={fileName}>{fileName}</div><div className="text-xs text-muted-foreground">{formatFileSize(attachment.size_bytes || 0)}</div></div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleDownload(attachment)} title="Скачать"><Download className="h-4 w-4" /></Button>
                {signedUrl && <Button variant="ghost" size="sm" onClick={() => onViewFile?.({ fileName, fileUrl: signedUrl, mimeType: attachment.mime_type })} title="Просмотр"><Eye className="h-4 w-4" /></Button>}
                {onDelete && <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(attachment)} title="Удалить"><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
