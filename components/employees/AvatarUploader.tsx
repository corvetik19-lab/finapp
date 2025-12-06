'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { ImageCropper } from './ImageCropper';
import { Button } from "@/components/ui/button";
import { X, Camera, Loader2 } from "lucide-react";

interface AvatarUploaderProps {
  employeeId: string;
  currentAvatarUrl?: string | null;
  employeeName: string;
  roleColor?: string;
  onUpload?: (url: string) => void;
}

export function AvatarUploader({
  employeeId,
  currentAvatarUrl,
  employeeName,
  roleColor = '#3b82f6',
  onUpload
}: AvatarUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = employeeName
    .split(' ')
    .map(n => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Валидация
    if (!file.type.startsWith('image/')) {
      setError('Выберите изображение');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Файл слишком большой (макс. 5 МБ)');
      return;
    }

    setError(null);
    
    // Открываем кроппер
    const reader = new FileReader();
    reader.onload = (event) => {
      setCropperImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    // Сбрасываем input чтобы можно было выбрать тот же файл снова
    e.target.value = '';
  };

  const handleCrop = async (croppedBlob: Blob) => {
    setCropperImage(null);
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', croppedBlob, 'avatar.jpg');
      formData.append('employeeId', employeeId);

      const response = await fetch('/api/employees/avatar', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка загрузки');
      }

      const { url } = await response.json();
      setAvatarUrl(url);
      onUpload?.(url);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!avatarUrl) return;
    
    if (!confirm('Удалить фото?')) return;

    setUploading(true);
    try {
      const response = await fetch(`/api/employees/avatar?employeeId=${employeeId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Ошибка удаления');
      }

      setAvatarUrl(null);
      onUpload?.('');
    } catch (err) {
      console.error('Delete error:', err);
      setError('Ошибка удаления');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <div 
        className="w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold cursor-pointer overflow-hidden relative group"
        style={{ background: avatarUrl ? 'transparent' : roleColor, cursor: uploading ? 'wait' : 'pointer' }}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        {avatarUrl ? <Image src={avatarUrl} alt={employeeName} fill className="object-cover" /> : <span>{initials}</span>}
        {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="h-6 w-6 text-white animate-spin" /></div>}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Camera className="h-6 w-6 text-white" /></div>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
      {avatarUrl && <Button variant="destructive" size="icon" className="absolute -top-1 -right-1 h-6 w-6 rounded-full" onClick={handleRemove} disabled={uploading} title="Удалить"><X className="h-3 w-3" /></Button>}
      {error && <p className="text-destructive text-xs mt-1 text-center">{error}</p>}
      {cropperImage && <ImageCropper imageSrc={cropperImage} onCrop={handleCrop} onCancel={() => setCropperImage(null)} />}
    </div>
  );
}
