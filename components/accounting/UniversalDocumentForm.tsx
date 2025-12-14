"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Copy,
  Printer,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  DocumentFormType,
  DocumentFormData,
  DocumentItem,
  DocumentStatus,
  DOCUMENT_TYPE_NAMES,
  DOCUMENT_STATUS_NAMES,
  calculateItemTotals,
  calculateDocumentTotals,
} from "@/lib/accounting/document-forms-service";

interface CounterpartyOption {
  id: string;
  name: string;
  inn?: string;
}

interface UniversalDocumentFormProps {
  documentType: DocumentFormType;
  initialData?: DocumentFormData;
  counterparties: CounterpartyOption[];
  nextDocumentNumber: string;
  onSave?: (data: DocumentFormData) => Promise<void>;
  onCopy?: () => Promise<void>;
  onPrint?: () => void;
}

function formatMoney(kopecks: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 2,
  }).format(kopecks / 100);
}

const VAT_RATES = [
  { value: 0, label: "Без НДС" },
  { value: 10, label: "10%" },
  { value: 20, label: "20%" },
];

const UNITS = [
  { value: "шт", label: "шт." },
  { value: "усл", label: "усл." },
  { value: "час", label: "час" },
  { value: "кг", label: "кг" },
  { value: "м", label: "м" },
  { value: "м2", label: "м²" },
  { value: "м3", label: "м³" },
  { value: "л", label: "л" },
  { value: "компл", label: "компл." },
];

export function UniversalDocumentForm({
  documentType,
  initialData,
  counterparties,
  nextDocumentNumber,
  onSave,
  onCopy,
  onPrint,
}: UniversalDocumentFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Основные данные документа
  const [documentNumber, setDocumentNumber] = useState(
    initialData?.documentNumber || nextDocumentNumber
  );
  const [documentDate, setDocumentDate] = useState(
    initialData?.documentDate || new Date().toISOString().split("T")[0]
  );
  const [counterpartyId, setCounterpartyId] = useState(
    initialData?.counterpartyId || ""
  );
  const [status, setStatus] = useState<DocumentStatus>(
    initialData?.status || "draft"
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [paymentDueDate, setPaymentDueDate] = useState(
    initialData?.paymentDueDate || ""
  );

  // Позиции документа
  const [items, setItems] = useState<DocumentItem[]>(
    initialData?.items || [
      {
        name: "",
        unit: "шт",
        quantity: 1,
        price: 0,
        vatRate: 20,
        vatAmount: 0,
        totalAmount: 0,
      },
    ]
  );

  // Итоги
  const [totals, setTotals] = useState({
    subtotalAmount: 0,
    vatAmount: 0,
    totalAmount: 0,
  });

  // Пересчёт итогов при изменении позиций
  useEffect(() => {
    const newTotals = calculateDocumentTotals(items);
    setTotals(newTotals);
  }, [items]);

  // Добавить позицию
  const addItem = useCallback(() => {
    setItems([
      ...items,
      {
        name: "",
        unit: "шт",
        quantity: 1,
        price: 0,
        vatRate: 20,
        vatAmount: 0,
        totalAmount: 0,
      },
    ]);
  }, [items]);

  // Удалить позицию
  const removeItem = useCallback(
    (index: number) => {
      if (items.length > 1) {
        setItems(items.filter((_, i) => i !== index));
      }
    },
    [items]
  );

  // Обновить позицию
  const updateItem = useCallback(
    (index: number, field: keyof DocumentItem, value: string | number) => {
      const newItems = [...items];
      const item = { ...newItems[index] };

      if (field === "name" || field === "unit" || field === "description") {
        item[field] = value as string;
      } else if (field === "quantity" || field === "price" || field === "vatRate") {
        const numValue = typeof value === "string" ? parseFloat(value) || 0 : value;
        
        if (field === "quantity") {
          item.quantity = numValue;
        } else if (field === "price") {
          item.price = Math.round(numValue * 100); // Конвертируем в копейки
        } else if (field === "vatRate") {
          item.vatRate = numValue;
        }

        // Пересчитываем суммы
        const { vatAmount, totalAmount } = calculateItemTotals(
          item.quantity,
          item.price,
          item.vatRate
        );
        item.vatAmount = vatAmount;
        item.totalAmount = totalAmount;
      }

      newItems[index] = item;
      setItems(newItems);
    },
    [items]
  );

  // Сохранить документ
  const handleSave = async () => {
    if (!onSave) return;

    setSaving(true);
    try {
      const counterparty = counterparties.find(c => c.id === counterpartyId);

      const data: DocumentFormData = {
        id: initialData?.id,
        documentType,
        documentNumber,
        documentDate,
        counterpartyId: counterpartyId || undefined,
        counterpartyName: counterparty?.name || "",
        counterpartyInn: counterparty?.inn,
        items,
        subtotalAmount: totals.subtotalAmount,
        vatAmount: totals.vatAmount,
        totalAmount: totals.totalAmount,
        status,
        notes: notes || undefined,
        paymentDueDate: paymentDueDate || undefined,
      };

      await onSave(data);
      router.push("/tenders/accounting/documents");
    } catch (error) {
      console.error("Error saving document:", error);
    } finally {
      setSaving(false);
    }
  };

  const isEditMode = !!initialData?.id;
  const documentTypeName = DOCUMENT_TYPE_NAMES[documentType];

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            {isEditMode ? `Редактирование: ${documentTypeName}` : `Новый ${documentTypeName}`}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode ? `№ ${documentNumber}` : "Заполните данные документа"}
          </p>
        </div>
        <div className="flex gap-2">
          {isEditMode && onCopy && (
            <Button variant="outline" onClick={onCopy}>
              <Copy className="h-4 w-4 mr-2" />
              Копировать
            </Button>
          )}
          {isEditMode && onPrint && (
            <Button variant="outline" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-2" />
              Печать
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </div>

      {/* Основные данные */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Основные данные</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Номер документа</Label>
              <Input
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="№"
              />
            </div>
            <div className="space-y-2">
              <Label>Дата документа</Label>
              <Input
                type="date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Срок оплаты</Label>
              <Input
                type="date"
                value={paymentDueDate}
                onChange={(e) => setPaymentDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as DocumentStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_STATUS_NAMES).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Контрагент */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Контрагент</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Выберите контрагента</Label>
            <Select value={counterpartyId} onValueChange={setCounterpartyId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите контрагента" />
              </SelectTrigger>
              <SelectContent>
                {counterparties.map((cp) => (
                  <SelectItem key={cp.id} value={cp.id}>
                    {cp.name} {cp.inn && `(ИНН: ${cp.inn})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Позиции */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Позиции</span>
            <Button size="sm" variant="outline" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" />
              Добавить
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">№</TableHead>
                <TableHead>Наименование</TableHead>
                <TableHead className="w-24">Ед.</TableHead>
                <TableHead className="w-24 text-right">Кол-во</TableHead>
                <TableHead className="w-32 text-right">Цена, ₽</TableHead>
                <TableHead className="w-24">НДС</TableHead>
                <TableHead className="w-32 text-right">Сумма НДС</TableHead>
                <TableHead className="w-32 text-right">Итого</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{idx + 1}</TableCell>
                  <TableCell>
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(idx, "name", e.target.value)}
                      placeholder="Наименование товара/услуги"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.unit}
                      onValueChange={(v) => updateItem(idx, "unit", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u.value} value={u.value}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                      className="text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={(item.price / 100).toFixed(2)}
                      onChange={(e) => updateItem(idx, "price", e.target.value)}
                      className="text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={String(item.vatRate)}
                      onValueChange={(v) => updateItem(idx, "vatRate", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VAT_RATES.map((r) => (
                          <SelectItem key={r.value} value={String(r.value)}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatMoney(item.vatAmount)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(item.totalAmount)}
                  </TableCell>
                  <TableCell>
                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Итоги */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-end">
            <div className="w-80 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Сумма без НДС:</span>
                <span>{formatMoney(totals.subtotalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">НДС:</span>
                <span>{formatMoney(totals.vatAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Итого:</span>
                <span className="text-primary">{formatMoney(totals.totalAmount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Примечания */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Примечания</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Дополнительная информация..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Статус */}
      {isEditMode && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">Текущий статус:</span>
              <Badge
                variant={
                  status === "paid"
                    ? "default"
                    : status === "cancelled"
                    ? "destructive"
                    : "secondary"
                }
              >
                {status === "paid" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {status === "cancelled" && <X className="h-3 w-3 mr-1" />}
                {DOCUMENT_STATUS_NAMES[status]}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
