'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Plus, X, FileText, Trash2, Upload, Loader2, FolderOpen } from "lucide-react";

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

  const loadDocuments = useCallback(async () => {
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
  }, [employeeId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

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

  if (loading) return <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" />Загрузка документов...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h4 className="font-semibold flex items-center gap-2"><FileText className="h-5 w-5" />Документы</h4><Button onClick={() => setShowUploadForm(!showUploadForm)} variant={showUploadForm ? "outline" : "default"} size="sm">{showUploadForm ? <><X className="h-4 w-4 mr-1" />Отмена</> : <><Plus className="h-4 w-4 mr-1" />Добавить</>}</Button></div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {showUploadForm && <Card><CardContent className="pt-4"><form onSubmit={handleUpload} className="space-y-3">
        <div className="grid grid-cols-2 gap-2"><Input placeholder="Название документа" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /><select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">{DOCUMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}</select></div>
        <div className="grid grid-cols-2 gap-2"><input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="text-sm" required /><Input type="date" value={formData.expires_at} onChange={e => setFormData({ ...formData, expires_at: e.target.value })} /></div>
        <Textarea placeholder="Примечания" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} />
        <Button type="submit" disabled={uploading}>{uploading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Загрузка...</> : <><Upload className="h-4 w-4 mr-1" />Загрузить</>}</Button>
      </form></CardContent></Card>}

      {documents.length === 0 ? <div className="text-center py-8"><FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">Документы не загружены</p></div> : <div className="space-y-2">{documents.map(doc => <Card key={doc.id}><CardContent className="pt-3 flex items-center gap-3"><span className="text-2xl">{getTypeIcon(doc.type)}</span><div className="flex-1"><a href={doc.file_path} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">{doc.name}</a><div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1"><Badge variant="outline">{doc.type_label}</Badge><span>{formatFileSize(doc.file_size)}</span>{doc.expires_at && <span>до {new Date(doc.expires_at).toLocaleDateString('ru-RU')}</span>}</div>{doc.notes && <p className="text-xs text-muted-foreground mt-1">{doc.notes}</p>}</div><Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(doc.id)} title="Удалить"><Trash2 className="h-4 w-4" /></Button></CardContent></Card>)}</div>}
    </div>
  );
}
