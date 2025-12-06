'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Paperclip, Loader2 } from 'lucide-react';

interface AttachmentPreviewModalProps {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  onClose: () => void;
}

export function AttachmentPreviewModal({ fileUrl, fileName, mimeType, onClose }: AttachmentPreviewModalProps) {
  const [loading, setLoading] = useState(true);

  const isImage = mimeType.startsWith('image/');
  const isPDF = mimeType === 'application/pdf';
  const isDoc = mimeType.includes('word') || mimeType.includes('document');

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate">{fileName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
              <p className="text-gray-500">Загрузка...</p>
            </div>
          )}

          {isImage && (
            <Image
              src={fileUrl}
              alt={fileName}
              width={800}
              height={600}
              className="w-full h-auto object-contain"
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
          )}

          {isPDF && (
            <iframe
              src={fileUrl}
              className="w-full h-[70vh] border-0"
              onLoad={() => setLoading(false)}
              title={fileName}
            />
          )}

          {isDoc && (
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
              className="w-full h-[70vh] border-0"
              onLoad={() => setLoading(false)}
              title={fileName}
            />
          )}

          {!isImage && !isPDF && !isDoc && (
            <div className="flex flex-col items-center justify-center py-12">
              <Paperclip className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">Предпросмотр недоступен для этого типа файла</p>
              <Button asChild>
                <a href={fileUrl} download={fileName}><Download className="h-4 w-4 mr-2" />Скачать файл</a>
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" asChild>
            <a href={fileUrl} download={fileName}><Download className="h-4 w-4 mr-2" />Скачать</a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
