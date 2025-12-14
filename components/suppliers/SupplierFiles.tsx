"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2,
  FileText,
  Download,
  Upload,
  Loader2,
  File,
} from "lucide-react";
import {
  SupplierFile,
  SupplierFileType,
  SUPPLIER_FILE_TYPES,
  formatFileSize,
} from "@/lib/suppliers/types";
import { createSupplierFile, deleteSupplierFile } from "@/lib/suppliers/service";
import { createBrowserClient } from "@supabase/ssr";

interface SupplierFilesProps {
  supplierId: string;
  files: SupplierFile[];
}

export function SupplierFiles({ supplierId, files }: SupplierFilesProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<SupplierFileType>("other");
  const [description, setDescription] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFormOpen(true);
    }
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setSelectedFile(null);
    setFileType("other");
    setDescription("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Генерируем уникальный путь
      const filePath = `${supplierId}/${Date.now()}_${selectedFile.name}`;

      // Загружаем файл
      const { error: uploadError } = await supabase.storage
        .from("supplier-files")
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw uploadError;
      }

      // Создаём запись в БД
      await createSupplierFile({
        supplier_id: supplierId,
        file_name: selectedFile.name,
        file_path: filePath,
        file_size: selectedFile.size,
        mime_type: selectedFile.type,
        file_type: fileType,
        description: description || undefined,
      });

      handleCloseForm();
      router.refresh();
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (file: SupplierFile) => {
    if (!confirm("Удалить файл?")) return;

    const success = await deleteSupplierFile(file.id);
    if (success) {
      router.refresh();
    }
  };

  const handleDownload = async (file: SupplierFile) => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data } = await supabase.storage
      .from("supplier-files")
      .createSignedUrl(file.file_path, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <File className="h-8 w-8 text-gray-400" />;
    if (mimeType.includes("pdf"))
      return <FileText className="h-8 w-8 text-red-500" />;
    if (mimeType.includes("image"))
      return <File className="h-8 w-8 text-blue-500" />;
    if (mimeType.includes("word"))
      return <FileText className="h-8 w-8 text-blue-600" />;
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet"))
      return <FileText className="h-8 w-8 text-green-600" />;
    return <File className="h-8 w-8 text-gray-400" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Файлы</h3>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.zip,.rar"
          />
          <Button size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" />
            Загрузить
          </Button>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Нет файлов</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getFileIcon(file.mime_type)}
                <div>
                  <p className="font-medium text-sm">{file.file_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {SUPPLIER_FILE_TYPES[file.file_type].name}
                    </Badge>
                    {file.file_size && <span>{formatFileSize(file.file_size)}</span>}
                    <span>
                      {new Date(file.created_at).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                  {file.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {file.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(file)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(file)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Форма загрузки */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Загрузка файла</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedFile && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Тип файла</Label>
              <Select
                value={fileType}
                onValueChange={(v) => setFileType(v as SupplierFileType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SUPPLIER_FILE_TYPES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Описание (необязательно)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Краткое описание файла"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>
              Отмена
            </Button>
            <Button onClick={handleUpload} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Загрузить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
