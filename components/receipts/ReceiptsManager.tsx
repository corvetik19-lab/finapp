"use client";

import { useState, useRef, useEffect } from 'react';
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera, Receipt, AlertCircle, Loader2, Eye, Download, Trash2, Link, FileText } from "lucide-react";

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

    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Получаем текущего пользователя и подписываемся на изменения
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('❌ [Desktop] No user found for Realtime subscription');
        return null;
      }
      console.log('🔄 [Desktop] Setting up Realtime subscription for user:', user.id);

      // Используем фильтр по user_id на уровне сервера
      const ch = supabase
        .channel(`receipts-sync-${user.id}`, {
          config: { broadcast: { self: true } },
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'attachments',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('📥 [Desktop] Realtime INSERT event:', payload);
            const newAttachment = payload.new as Attachment;
            
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
            event: 'UPDATE',
            schema: 'public',
            table: 'attachments',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('📝 [Desktop] Realtime UPDATE event:', payload);
            const updatedAttachment = payload.new as Attachment;
            
            console.log('✅ [Desktop] Updating attachment:', updatedAttachment.file_name);
            setReceipts((prev) => prev.map(r => 
              r.id === updatedAttachment.id ? updatedAttachment : r
            ));
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
            console.log('🗑️ [Desktop] Realtime DELETE event:', payload);
            const oldAttachment = payload.old as { id: string };
            
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

      return ch;
    };

    setupRealtimeSubscription().then((ch) => {
      if (ch) channel = ch;
    });

    return () => {
      if (channel) {
        console.log('🔌 [Desktop] Removing Realtime channel');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Мои чеки</h1>
        <div>
          <input ref={fileInputRef} type="file" accept={ALLOWED_TYPES.join(',')} onChange={handleFileSelect} className="hidden" id="receipt-upload" disabled={uploading} />
          <Button asChild disabled={uploading}>
            <label htmlFor="receipt-upload" className="cursor-pointer">
              {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Загрузка...</> : <><Camera className="h-4 w-4 mr-2" />Загрузить чек</>}
            </label>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />{error}
        </div>
      )}

      {receipts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Receipt className="h-16 w-16 mb-4 opacity-50" />
          <h3 className="text-lg font-medium">Нет загруженных чеков</h3>
          <p className="text-sm">Загрузите фото или PDF чеков, чтобы хранить их здесь.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {receipts.map((file) => (
            <Card key={file.id} className="overflow-hidden">
              <div className="aspect-[4/3] bg-muted/50 cursor-pointer flex items-center justify-center" onClick={() => handlePreview(file)}>
                {file.mime_type.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/attachments/view?path=${encodeURIComponent(file.file_path)}`} alt={file.file_name} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <FileText className="h-16 w-16 text-red-500" />
                )}
              </div>
              <CardContent className="p-3 space-y-2">
                <div className="font-medium truncate text-sm" title={file.file_name}>{file.file_name}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{formatFileSize(file.file_size)}</span><span>•</span><span>{formatDate(file.created_at)}</span>
                </div>
                {file.transaction_id && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                    <Link className="h-3 w-3" />Привязан к транзакции
                  </div>
                )}
                <div className="flex items-center gap-1 pt-1">
                  <Button variant="ghost" size="sm" onClick={() => handlePreview(file)} title="Просмотр"><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" asChild title="Скачать">
                    <a href={`/api/attachments/download?path=${encodeURIComponent(file.file_path)}&name=${encodeURIComponent(file.file_name)}`} download><Download className="h-4 w-4" /></a>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(file.id, file.file_path)} title="Удалить"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl p-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {previewUrl && <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-[80vh] object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
