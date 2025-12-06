'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Tender } from '@/lib/tenders/types';
import { useToast } from '@/components/toast/ToastContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, Download, Eye, Trash2, Check, X, FileText, FileSpreadsheet, FileImage, FileArchive, Paperclip, Loader2, FolderOpen, User } from 'lucide-react';

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

  const getFileIconComponent = (fileName: string) => {
    const ext = getFileExtension(fileName).toLowerCase();
    if (['.doc', '.docx', '.pdf'].includes(ext)) return <FileText className="h-4 w-4 text-blue-600" />;
    if (['.xls', '.xlsx'].includes(ext)) return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
    if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) return <FileImage className="h-4 w-4 text-purple-600" />;
    if (['.zip', '.rar', '.7z'].includes(ext)) return <FileArchive className="h-4 w-4 text-orange-600" />;
    return <Paperclip className="h-4 w-4 text-gray-600" />;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-2" />
        <span className="text-gray-500">Загрузка файлов...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Вкладки категорий */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(categoryLabels) as FileCategory[]).map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
          >
            {categoryLabels[category]}
          </Button>
        ))}
      </div>

      {/* Кнопка загрузки */}
      <div className="flex justify-end">
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Загрузка...</> : <><Upload className="h-4 w-4 mr-2" />Загрузить файл</>}
        </Button>
        <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
      </div>

      {/* Таблица файлов */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Файлов в этой категории пока нет</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Файл</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Дата</TableHead>
                  {selectedCategory !== 'tender' && <TableHead>Кто прикрепил</TableHead>}
                  <TableHead>Комментарий</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium">{file.file_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFileIconComponent(file.file_name)}
                        <span className="text-sm text-gray-500">{getFileExtension(file.file_name)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(file.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    {selectedCategory !== 'tender' && (
                      <TableCell>
                        {file.uploader_name ? (
                          <div className="flex items-center gap-1 text-sm">
                            <User className="h-4 w-4 text-gray-400" />
                            {file.uploader_name}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Неизвестно</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      {commentingFileId === file.id ? (
                        <div className="flex gap-1">
                          <Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Комментарий..." className="h-8 text-sm" autoFocus />
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleAddComment(file.id)}><Check className="h-4 w-4 text-green-600" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setCommentingFileId(null); setCommentText(''); }}><X className="h-4 w-4 text-red-500" /></Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-gray-500 h-8" onClick={() => { setCommentingFileId(file.id); setCommentText(file.comment || ''); }}>
                          {file.comment || 'Добавить комментарий'}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewingFile(file)} title="Просмотр"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(file)} title="Скачать"><Download className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(file.id)} title="Удалить"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Модалка просмотра файла */}
      <Dialog open={!!viewingFile} onOpenChange={() => setViewingFile(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{viewingFile?.file_name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {viewingFile && (
              <iframe
                src={`/api/tenders/${tender.id}/files/${viewingFile.id}/view`}
                className="w-full h-full border rounded"
                title={viewingFile.file_name}
              />
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => viewingFile && handleDownload(viewingFile)}>
              <Download className="h-4 w-4 mr-2" />
              Скачать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
