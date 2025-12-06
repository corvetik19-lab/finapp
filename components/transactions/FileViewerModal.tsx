'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

interface FileViewerModalProps {
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  onClose: () => void;
}

export function FileViewerModal({ fileName, fileUrl, mimeType, onClose }: FileViewerModalProps) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 truncate">
            <FileText className="h-4 w-4 flex-shrink-0" />
            {fileName}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-[400px] max-h-[60vh] overflow-auto rounded-lg border bg-muted/30">
          {mimeType?.startsWith('image/') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl} alt={fileName} className="max-w-full h-auto mx-auto" />
          ) : (
            <iframe src={fileUrl} className="w-full h-full min-h-[400px]" title="Просмотр файла" />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" asChild>
            <a href={fileUrl} download>
              <Download className="h-4 w-4 mr-1" />
              Скачать
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
