"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  RefreshCw,
  Check,
  Building2,
  MapPin,
  User,
  Calendar,
  Banknote,
  FileText,
  Loader2,
} from "lucide-react";

// =====================================================
// Компонент обогащения данных через DaData
// =====================================================

export interface DaDataInfo {
  inn: string;
  kpp?: string;
  ogrn?: string;
  name?: string;
  fullName?: string;
  shortName?: string;
  opf?: string;
  legalAddress?: string;
  actualAddress?: string;
  director?: string;
  directorPosition?: string;
  foundedDate?: string;
  authorizedCapital?: number;
  okved?: string;
  okvedName?: string;
  status?: string;
  statusDetail?: string;
}

interface SupplierDaDataEnrichProps {
  supplierId: string;
  currentInn?: string;
  currentData?: Partial<DaDataInfo>;
  onEnrich: (supplierId: string) => Promise<DaDataInfo | null>;
  onApplyData: (supplierId: string, data: Partial<DaDataInfo>) => Promise<void>;
}

export function SupplierDaDataEnrich({
  supplierId,
  currentInn,
  currentData: _currentData,
  onEnrich,
  onApplyData,
}: SupplierDaDataEnrichProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [enrichedData, setEnrichedData] = useState<DaDataInfo | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnrich = async () => {
    if (!currentInn) {
      setError("ИНН не указан");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await onEnrich(supplierId);
      if (data) {
        setEnrichedData(data);
        setShowDialog(true);
      } else {
        setError("Данные не найдены");
      }
    } catch {
      setError("Ошибка получения данных");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!enrichedData) return;

    setIsLoading(true);
    try {
      await onApplyData(supplierId, enrichedData);
      setShowDialog(false);
      setEnrichedData(null);
    } catch {
      setError("Ошибка сохранения данных");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "LIQUIDATING":
        return "bg-yellow-100 text-yellow-800";
      case "LIQUIDATED":
        return "bg-red-100 text-red-800";
      case "BANKRUPT":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "ACTIVE":
        return "Действующая";
      case "LIQUIDATING":
        return "Ликвидируется";
      case "LIQUIDATED":
        return "Ликвидирована";
      case "BANKRUPT":
        return "Банкрот";
      default:
        return status || "Неизвестно";
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleEnrich}
        disabled={isLoading || !currentInn}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-2" />
        )}
        Обогатить через DaData
      </Button>

      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Данные из DaData</DialogTitle>
            <DialogDescription>
              Проверьте полученные данные и примените их к карточке поставщика
            </DialogDescription>
          </DialogHeader>

          {enrichedData && (
            <div className="space-y-4">
              {/* Статус */}
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(enrichedData.status)}>
                  {getStatusLabel(enrichedData.status)}
                </Badge>
                {enrichedData.statusDetail && (
                  <span className="text-sm text-muted-foreground">
                    {enrichedData.statusDetail}
                  </span>
                )}
              </div>

              {/* Основная информация */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Организация
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <DataRow label="Полное название" value={enrichedData.fullName} />
                  <DataRow label="Краткое название" value={enrichedData.shortName} />
                  <DataRow label="ОПФ" value={enrichedData.opf} />
                  <DataRow label="ИНН" value={enrichedData.inn} />
                  <DataRow label="КПП" value={enrichedData.kpp} />
                  <DataRow label="ОГРН" value={enrichedData.ogrn} />
                </CardContent>
              </Card>

              {/* Руководитель */}
              {enrichedData.director && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Руководитель
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <DataRow label="ФИО" value={enrichedData.director} />
                    <DataRow label="Должность" value={enrichedData.directorPosition} />
                  </CardContent>
                </Card>
              )}

              {/* Адреса */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Адреса
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <DataRow label="Юридический адрес" value={enrichedData.legalAddress} />
                  <DataRow label="Фактический адрес" value={enrichedData.actualAddress} />
                </CardContent>
              </Card>

              {/* Дополнительно */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Дополнительно
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <DataRow
                    label="Дата регистрации"
                    value={enrichedData.foundedDate}
                    icon={<Calendar className="h-4 w-4" />}
                  />
                  <DataRow
                    label="Уставной капитал"
                    value={
                      enrichedData.authorizedCapital
                        ? `${(enrichedData.authorizedCapital / 100).toLocaleString("ru-RU")} ₽`
                        : undefined
                    }
                    icon={<Banknote className="h-4 w-4" />}
                  />
                  <DataRow
                    label="ОКВЭД"
                    value={
                      enrichedData.okved
                        ? `${enrichedData.okved} — ${enrichedData.okvedName}`
                        : undefined
                    }
                  />
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleApply} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Применить данные
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DataRow({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string;
  icon?: React.ReactNode;
}) {
  if (!value) return null;

  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground flex items-center gap-1">
        {icon}
        {label}:
      </span>
      <span className="font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}
