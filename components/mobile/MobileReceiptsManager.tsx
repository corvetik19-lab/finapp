"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Receipt, Eye, Download, Trash2, X, Loader2 } from "lucide-react";

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

    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Получаем текущего пользователя и подписываемся на изменения
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('❌ [Mobile] No user found for Realtime subscription');
        return null;
      }

      console.log('🔄 [Mobile] Setting up Realtime subscription for user:', user.id);

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
            console.log('📥 [Mobile] Realtime INSERT event:', payload);
            const newAttachment = payload.new as Attachment;
            
            console.log('✅ [Mobile] Adding new attachment:', newAttachment.file_name);
            setReceipts((prev) => {
              // Проверяем что файл еще не добавлен
              if (prev.some(r => r.id === newAttachment.id)) {
                console.log('⚠️ [Mobile] Attachment already exists, skipping');
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
            console.log('📝 [Mobile] Realtime UPDATE event:', payload);
            const updatedAttachment = payload.new as Attachment;
            
            console.log('✅ [Mobile] Updating attachment:', updatedAttachment.file_name);
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
            console.log('🗑️ [Mobile] Realtime DELETE event:', payload);
            const oldAttachment = payload.old as { id: string };
            
            console.log('✅ [Mobile] Removing attachment:', oldAttachment.id);
            setReceipts((prev) => prev.filter(r => r.id !== oldAttachment.id));
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ [Mobile] Realtime SUBSCRIBED successfully');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ [Mobile] Realtime CHANNEL_ERROR:', err);
          } else if (status === 'TIMED_OUT') {
            console.error('❌ [Mobile] Realtime TIMED_OUT');
          } else if (status === 'CLOSED') {
            console.log('🔌 [Mobile] Realtime CLOSED');
          } else {
            console.log('🔄 [Mobile] Realtime status:', status);
          }
        });

      return ch;
    };

    setupRealtimeSubscription().then((ch) => {
      if (ch) channel = ch;
    });

    return () => {
      if (channel) {
        console.log('🔌 [Mobile] Removing Realtime channel');
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
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold">📄 Мои чеки</h1><input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf" multiple capture="environment" className="hidden" /><Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>{isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Загрузка...</> : "📎 Загрузить"}</Button></div>
      {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive"><AlertCircle className="h-4 w-4" />{error}</div>}
      {receipts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Receipt className="h-16 w-16 mb-4" /><h3 className="font-semibold">Нет загруженных чеков</h3><p className="text-sm">Нажмите кнопку &quot;Загрузить&quot; чтобы добавить чеки</p></div>
      ) : (
        <div className="space-y-2">{receipts.map((receipt) => (
          <Card key={receipt.id}><CardContent className="flex items-center gap-3 py-3">
            <span className="text-2xl">{receipt.mime_type.startsWith('image/') ? '🖼️' : '📄'}</span>
            <div className="flex-1 min-w-0"><div className="font-medium text-sm truncate">{receipt.file_name}</div><div className="text-xs text-muted-foreground">{formatFileSize(receipt.file_size)} • {formatDate(receipt.created_at)}</div></div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (receipt.mime_type.startsWith('image/')) { setPreviewImage({ url: `/api/attachments/view?path=${encodeURIComponent(receipt.file_path)}`, name: receipt.file_name }); } else { window.open(`/api/attachments/view?path=${encodeURIComponent(receipt.file_path)}`, '_blank'); } }}><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild><a href={`/api/attachments/download?path=${encodeURIComponent(receipt.file_path)}&name=${encodeURIComponent(receipt.file_name)}`}><Download className="h-4 w-4" /></a></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(receipt.id, receipt.file_path)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </CardContent></Card>
        ))}</div>
      )}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 bg-background rounded-t-lg"><h3 className="font-semibold truncate">{previewImage.name}</h3><Button variant="ghost" size="icon" onClick={() => setPreviewImage(null)}><X className="h-5 w-5" /></Button></div>
            <div className="bg-background p-4 rounded-b-lg"><Image src={previewImage.url} alt={previewImage.name} width={800} height={600} className="max-w-full h-auto rounded" unoptimized /></div>
          </div>
        </div>
      )}
    </div>
  );
}
