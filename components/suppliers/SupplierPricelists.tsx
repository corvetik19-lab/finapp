"use client";

import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileSpreadsheet,
  Plus,
  Download,
  Trash2,
  MoreHorizontal,
  Calendar,
  CheckCircle,
  XCircle,
  Upload,
} from "lucide-react";
import { SupplierPricelist } from "@/lib/suppliers/types";
import {
  deletePricelist,
  togglePricelistActive,
  getPricelistDownloadUrl,
} from "@/lib/suppliers/pricelist-service";
import { useRouter } from "next/navigation";

interface SupplierPricelistsProps {
  supplierId: string;
  pricelists: SupplierPricelist[];
}

export function SupplierPricelists({ supplierId, pricelists }: SupplierPricelistsProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Upload form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const activePricelists = pricelists.filter((p) => p.is_active);
  const archivedPricelists = pricelists.filter((p) => !p.is_active);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedFile(null);
    setValidFrom("");
    setValidUntil("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("supplier_id", supplierId);
      formData.append("title", title.trim());
      if (description) formData.append("description", description.trim());
      if (validFrom) formData.append("valid_from", validFrom);
      if (validUntil) formData.append("valid_until", validUntil);

      // TODO: Implement server action for file upload
      // For now just close the dialog
      resetForm();
      setUploadOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (pricelist: SupplierPricelist) => {
    const url = await getPricelistDownloadUrl(pricelist.file_path);
    if (url) {
      window.open(url, "_blank");
    }
  };

  const handleToggleActive = async (pricelist: SupplierPricelist) => {
    await togglePricelistActive(pricelist.id, !pricelist.is_active);
    router.refresh();
  };

  const handleDelete = async (pricelistId: string) => {
    if (!confirm("Удалить прайс-лист?")) return;
    await deletePricelist(pricelistId);
    router.refresh();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isExpired = (pricelist: SupplierPricelist) => {
    if (!pricelist.valid_until) return false;
    return new Date(pricelist.valid_until) < new Date();
  };

  const renderPricelist = (pricelist: SupplierPricelist) => {
    const expired = isExpired(pricelist);

    return (
      <div
        key={pricelist.id}
        className={`p-4 rounded-lg border ${
          expired ? "border-orange-200 bg-orange-50" :
          pricelist.is_active ? "border-gray-100 hover:bg-gray-50" :
          "border-gray-100 bg-gray-50 opacity-60"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <FileSpreadsheet className="h-8 w-8 text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium truncate">{pricelist.title}</span>
                {pricelist.is_active ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Актуален
                  </Badge>
                ) : (
                  <Badge variant="secondary">Архив</Badge>
                )}
                {expired && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    Истёк
                  </Badge>
                )}
              </div>

              {pricelist.description && (
                <p className="text-sm text-gray-500 mb-2">{pricelist.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                <span>{pricelist.file_name}</span>
                {pricelist.file_size && (
                  <span>{formatFileSize(pricelist.file_size)}</span>
                )}
                {pricelist.valid_from && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    с {formatDate(pricelist.valid_from)}
                  </span>
                )}
                {pricelist.valid_until && (
                  <span className={expired ? "text-orange-500" : ""}>
                    до {formatDate(pricelist.valid_until)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(pricelist)}
            >
              <Download className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleToggleActive(pricelist)}>
                  {pricelist.is_active ? (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      В архив
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Сделать актуальным
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(pricelist.id)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Прайс-листы</h3>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Загрузить
        </Button>
      </div>

      {pricelists.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Нет загруженных прайс-листов</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activePricelists.length > 0 && (
            <div className="space-y-2">
              {activePricelists.map(renderPricelist)}
            </div>
          )}

          {archivedPricelists.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-500">Архив</h4>
              {archivedPricelists.map(renderPricelist)}
            </div>
          )}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Загрузить прайс-лист</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="h-6 w-6 text-green-600" />
                  <span className="font-medium">{selectedFile.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">
                    Нажмите для выбора файла
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Excel, CSV или PDF
                  </p>
                </>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-1 block">Название *</label>
              <Input
                placeholder="Прайс-лист 2024"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-1 block">Описание</label>
              <Input
                placeholder="Описание..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Действует с</label>
                <Input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Действует до</label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleUpload}
              disabled={loading || !selectedFile || !title.trim()}
            >
              {loading ? "Загрузка..." : "Загрузить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
