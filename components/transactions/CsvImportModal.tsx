"use client";

import { useState, useMemo, useCallback, useRef, Fragment, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, Merge, Plus, X, Loader2, Maximize2, Minimize2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Category = {
  id: string;
  name: string;
  kind: string;
};

type Product = {
  id: string;
  name: string;
  category_id: string | null;
  category_type: "income" | "expense" | null; // тип товара (доход/расход)
  default_unit: string;
  default_price_per_unit: number | null;
};

type ParsedOperation = {
  id: string;
  date: string;
  amount: number; // в копейках
  description: string;
  originalCategory: string;
  selected: boolean;
  excluded: boolean;
};

type GroupedOperation = {
  description: string;
  operations: ParsedOperation[];
  totalAmount: number;
  count: number;
};

type MergedOperation = {
  id: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  operationIds: string[]; // ID исходных операций
  date: string;
  productId?: string;
  productName?: string;
  productUnit?: string; // Сохраняем unit для надёжности
};

interface CsvImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  products?: Product[];
  onImport: (transactions: Array<{
    date: string;
    amount: number;
    description: string;
    category_id: string | null;
    direction: "income" | "expense";
    product?: {
      id: string;
      name: string;
      quantity: number;
      unit: string;
      price_per_unit: number;
    };
  }>) => Promise<void>;
}

const STORAGE_KEY = "csv-import-data";

type StoredData = {
  operations: ParsedOperation[];
  fileName: string;
  categoryAssignments: [string, string][];
  mergedOperations: MergedOperation[];
};

export function CsvImportModal({ open, onOpenChange, categories, products = [], onImport }: CsvImportModalProps) {
  const [operations, setOperations] = useState<ParsedOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeProduct, setMergeProduct] = useState("");
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set());
  const [selectedMergedForCombine, setSelectedMergedForCombine] = useState<Set<string>>(new Set());
  const [mergeCategory, setMergeCategory] = useState("");
  const [mergedOperations, setMergedOperations] = useState<MergedOperation[]>([]);
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMergedCollapsed, setIsMergedCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categoryAssignments, setCategoryAssignments] = useState<Map<string, string>>(new Map());

  // Загрузка сохранённых данных при монтировании
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: StoredData = JSON.parse(saved);
        if (data.operations && data.operations.length > 0) {
          setOperations(data.operations);
          setFileName(data.fileName || "Восстановлено");
          setCategoryAssignments(new Map(data.categoryAssignments || []));
          setMergedOperations(data.mergedOperations || []);
          setStep("review");
        }
      }
    } catch {
      // Failed to load saved CSV data
    }
  }, []);

  // Сохранение данных при изменении операций
  useEffect(() => {
    if (operations.length > 0 || mergedOperations.length > 0) {
      const data: StoredData = {
        operations,
        fileName,
        categoryAssignments: Array.from(categoryAssignments.entries()),
        mergedOperations,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [operations, fileName, categoryAssignments, mergedOperations]);

  // Очистка localStorage
  const clearStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Категории расходов и доходов
  const expenseCategories = categories.filter(c => c.kind === "expense" || c.kind === "both");
  const incomeCategories = categories.filter(c => c.kind === "income" || c.kind === "both");

  // Парсинг CSV
  const parseCSV = useCallback((text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const parsed: ParsedOperation[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Парсим CSV с разделителем ; и кавычками
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ";" && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      // Индексы: 1 - Дата платежа, 4 - Сумма операции, 9 - Категория, 11 - Описание
      const dateStr = values[1] || "";
      const amountStr = values[4]?.replace(",", ".").replace(/\s/g, "") || "0";
      const category = values[9] || "";
      const description = values[11] || "";

      if (!dateStr || !description) continue;

      const amount = Math.round(parseFloat(amountStr) * 100); // в копейках
      
      parsed.push({
        id: `op-${i}-${Date.now()}`,
        date: dateStr,
        amount,
        description,
        originalCategory: category,
        selected: false,
        excluded: false,
      });
    }

    return parsed;
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setFileName(file.name);

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      setOperations(parsed);
      setStep("review");
    } catch {
      alert("Ошибка при чтении файла");
    } finally {
      setLoading(false);
    }
  };

  // Группировка по описанию
  const groupedOperations = useMemo(() => {
    const groups = new Map<string, ParsedOperation[]>();
    
    operations.filter(op => !op.excluded).forEach(op => {
      const key = op.description;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(op);
    });

    const result: GroupedOperation[] = [];
    groups.forEach((ops, description) => {
      result.push({
        description,
        operations: ops,
        totalAmount: ops.reduce((sum, op) => sum + op.amount, 0),
        count: ops.length,
      });
    });

    return result.sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount));
  }, [operations]);

  // Статистика
  const stats = useMemo(() => {
    const active = operations.filter(op => !op.excluded);
    const selected = operations.filter(op => op.selected && !op.excluded);
    const totalIncome = active.filter(op => op.amount > 0).reduce((sum, op) => sum + op.amount, 0);
    const totalExpense = active.filter(op => op.amount < 0).reduce((sum, op) => sum + Math.abs(op.amount), 0);
    
    return {
      total: active.length,
      selected: selected.length,
      excluded: operations.filter(op => op.excluded).length,
      totalIncome,
      totalExpense,
      selectedAmount: selected.reduce((sum, op) => sum + op.amount, 0),
    };
  }, [operations]);

  const toggleSelect = (id: string) => {
    setOperations(prev => prev.map(op => 
      op.id === id ? { ...op, selected: !op.selected } : op
    ));
  };

  const toggleSelectGroup = (description: string) => {
    const group = groupedOperations.find(g => g.description === description);
    if (!group) return;
    
    const allSelected = group.operations.every(op => op.selected);
    const ids = new Set(group.operations.map(op => op.id));
    
    setOperations(prev => prev.map(op => 
      ids.has(op.id) ? { ...op, selected: !allSelected } : op
    ));
  };

  const excludeSelected = () => {
    setOperations(prev => prev.map(op => 
      op.selected ? { ...op, excluded: true, selected: false } : op
    ));
  };

  const toggleMergeSelect = (id: string) => {
    setSelectedForMerge(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Вычисляем общую сумму для объединения (обычные + выбранные объединённые)
  const mergeTotal = useMemo(() => {
    const opsSum = operations
      .filter(op => selectedForMerge.has(op.id))
      .reduce((sum, op) => sum + op.amount, 0);
    const mergedSum = mergedOperations
      .filter(m => selectedMergedForCombine.has(m.id))
      .reduce((sum, m) => sum + m.amount, 0);
    return opsSum + mergedSum;
  }, [operations, selectedForMerge, mergedOperations, selectedMergedForCombine]);

  const handleMerge = () => {
    const hasOps = selectedForMerge.size > 0;
    const hasMerged = selectedMergedForCombine.size > 0;
    
    // Если выбраны только объединённые операции (без обычных) - режим вычитания
    if (!hasOps && hasMerged && selectedMergedForCombine.size >= 2) {
      const selectedMerged = mergedOperations.filter(m => selectedMergedForCombine.has(m.id));
      const incomes = selectedMerged.filter(m => m.amount >= 0);
      const expenses = selectedMerged.filter(m => m.amount < 0);
      
      // Если есть и доходы и расходы - вычитаем расходы из первого дохода
      if (incomes.length > 0 && expenses.length > 0) {
        const targetIncome = incomes[0];
        const expenseSum = expenses.reduce((sum, e) => sum + e.amount, 0); // отрицательная сумма
        const newAmount = targetIncome.amount + expenseSum; // вычитание (т.к. expenseSum отрицательный)
        
        // Собираем все ID операций
        const allOpIds = [
          ...targetIncome.operationIds,
          ...expenses.flatMap(e => e.operationIds)
        ];
        
        // Обновляем доход, удаляем расходы
        setMergedOperations(prev => prev.map(m => {
          if (m.id === targetIncome.id) {
            return { ...m, amount: newAmount, operationIds: allOpIds };
          }
          return m;
        }).filter(m => !expenses.some(e => e.id === m.id)));
        
        setSelectedMergedForCombine(new Set());
        setMergeMode(false);
        return;
      }
    }
    
    // Обычная логика объединения - требует категорию
    if ((!hasOps && !hasMerged) || !mergeCategory) return;

    const idsToMerge = Array.from(selectedForMerge);
    const mergedIdsToMerge = Array.from(selectedMergedForCombine);
    
    // Собираем все ID исходных операций (включая из объединённых)
    const allOperationIds = [
      ...idsToMerge,
      ...mergedOperations
        .filter(m => mergedIdsToMerge.includes(m.id))
        .flatMap(m => m.operationIds)
    ];

    const opsToMerge = operations.filter(op => idsToMerge.includes(op.id));
    const category = categories.find(c => c.id === mergeCategory);
    
    // Берём дату из последней операции (сортируем по дате)
    const allDates: string[] = [
      ...opsToMerge.map(op => op.date),
      ...mergedOperations
        .filter(m => mergedIdsToMerge.includes(m.id))
        .map(m => m.date)
    ].filter(Boolean);
    
    // Сортируем даты (формат DD.MM.YYYY) и берём последнюю
    const sortedDates = allDates.sort((a, b) => {
      const [d1, m1, y1] = a.split('.').map(Number);
      const [d2, m2, y2] = b.split('.').map(Number);
      return new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime();
    });
    const lastDate = sortedDates[0] || "";

    // Находим выбранный товар (если не "__none__")
    const product = mergeProduct && mergeProduct !== "__none__" 
      ? products.find(p => p.id === mergeProduct) 
      : null;


    // Создаём объединённую операцию
    const newMerged: MergedOperation = {
      id: `merged-${Date.now()}`,
      amount: mergeTotal,
      categoryId: mergeCategory,
      categoryName: category?.name || "",
      operationIds: allOperationIds,
      date: lastDate,
      productId: product?.id,
      productName: product?.name,
      productUnit: product?.default_unit || "шт",
    };


    // Удаляем выбранные объединённые операции
    setMergedOperations(prev => [
      ...prev.filter(m => !mergedIdsToMerge.includes(m.id)),
      newMerged
    ]);

    // Исключаем исходные операции из обычного списка
    setOperations(prev => prev.map(op => 
      idsToMerge.includes(op.id) ? { ...op, excluded: true, selected: false } : op
    ));

    setSelectedForMerge(new Set());
    setSelectedMergedForCombine(new Set());
    setMergeCategory("");
    setMergeProduct("");
    setMergeMode(false);
  };

  // Удаление объединённой операции (возвращает операции обратно)
  const deleteMerged = (mergedId: string) => {
    const merged = mergedOperations.find(m => m.id === mergedId);
    if (!merged) return;

    // Возвращаем исходные операции
    setOperations(prev => prev.map(op => 
      merged.operationIds.includes(op.id) ? { ...op, excluded: false } : op
    ));

    // Удаляем объединённую
    setMergedOperations(prev => prev.filter(m => m.id !== mergedId));
    
    // Убираем из выбранных если была выбрана
    setSelectedMergedForCombine(prev => {
      const next = new Set(prev);
      next.delete(mergedId);
      return next;
    });
  };

  // Переключение выбора объединённой операции
  const toggleMergedSelect = (id: string) => {
    setSelectedMergedForCombine(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const assignCategory = (operationId: string, categoryId: string) => {
    setCategoryAssignments(prev => {
      const next = new Map(prev);
      next.set(operationId, categoryId);
      return next;
    });
  };

  const handleImport = async () => {
    const selected = operations.filter(op => op.selected && !op.excluded);
    const hasMerged = mergedOperations.length > 0;
    
    if (selected.length === 0 && !hasMerged) {
      alert("Выберите операции для импорта или создайте объединённые");
      return;
    }

    setImporting(true);
    try {
      // Обычные выбранные операции
      const regularTransactions = selected.map(op => ({
        date: formatDateForDB(op.date),
        amount: Math.abs(op.amount),
        description: op.description,
        category_id: categoryAssignments.get(op.id) || null,
        direction: (op.amount >= 0 ? "income" : "expense") as "income" | "expense",
      }));

      // Объединённые операции - используем сохранённые данные напрямую
      const mergedTransactions = mergedOperations.map(m => {
        // Если есть productId и productName - создаём product объект
        const hasProduct = m.productId && m.productName;
        return {
          date: formatDateForDB(m.date),
          amount: Math.abs(m.amount),
          description: m.productName || m.categoryName, // Название = товар или категория
          category_id: m.categoryId,
          direction: (m.amount >= 0 ? "income" : "expense") as "income" | "expense",
          product: hasProduct ? {
            id: m.productId!,
            name: m.productName!,
            quantity: 1,
            unit: m.productUnit || "шт",
            price_per_unit: Math.abs(m.amount), // вся сумма = цена за единицу
          } : undefined,
        };
      });

      await onImport([...regularTransactions, ...mergedTransactions]);
      
      // Очищаем localStorage и сбрасываем состояние
      clearStorage();
      setOperations([]);
      setMergedOperations([]);
      setStep("upload");
      setFileName("");
      setCategoryAssignments(new Map());
      onOpenChange(false);
    } catch {
      alert("Ошибка при импорте");
    } finally {
      setImporting(false);
    }
  };

  const formatDateForDB = (dateStr: string): string => {
    // Формат входа: "04.12.2025"
    const parts = dateStr.split(".");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const formatMoney = (amount: number) => {
    const value = amount / 100;
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Сброс для загрузки нового файла (очищает и localStorage)
  const resetForNewFile = () => {
    clearStorage();
    setOperations([]);
    setMergedOperations([]);
    setStep("upload");
    setFileName("");
    setCategoryAssignments(new Map());
    setMergeMode(false);
    setSelectedForMerge(new Set());
    setSelectedMergedForCombine(new Set());
  };

  // Сброс только UI состояния (без очистки localStorage)
  const resetUI = () => {
    setMergeMode(false);
    setSelectedForMerge(new Set());
    setSelectedMergedForCombine(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetUI(); onOpenChange(v); }}>
      <DialogContent className={cn(
          "overflow-hidden flex flex-col transition-all duration-200",
          isFullscreen 
            ? "w-[98vw] max-w-[98vw] h-[98vh] max-h-[98vh]" 
            : "max-w-5xl max-h-[90vh]"
        )}>
        {/* Кнопка разворачивания рядом с крестиком */}
        <button
          type="button"
          className="absolute right-12 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onClick={() => setIsFullscreen(!isFullscreen)}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          <span className="sr-only">{isFullscreen ? "Свернуть" : "Развернуть"}</span>
        </button>

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Импорт операций из CSV
          </DialogTitle>
          <DialogDescription>
            {step === "upload" 
              ? "Загрузите выписку из банка в формате CSV"
              : `Загружено ${stats.total} операций из ${fileName}`
            }
          </DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="p-6 rounded-full bg-muted">
              <Upload className="h-12 w-12 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Поддерживается формат выписки Тинькофф</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              size="lg"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Выбрать файл CSV
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Статистика */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Операций</div>
              </div>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-center">
                <div className="text-2xl font-bold text-green-600">{formatMoney(stats.totalIncome)}</div>
                <div className="text-xs text-muted-foreground">Доходы</div>
              </div>
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-center">
                <div className="text-2xl font-bold text-red-600">{formatMoney(-stats.totalExpense)}</div>
                <div className="text-xs text-muted-foreground">Расходы</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.selected}</div>
                <div className="text-xs text-muted-foreground">Выбрано</div>
              </div>
            </div>

            {/* Действия */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                if (!mergeMode) {
                  // При включении режима объединения - копируем уже выбранные операции
                  const selectedIds = operations.filter(op => op.selected && !op.excluded).map(op => op.id);
                  setSelectedForMerge(new Set(selectedIds));
                } else {
                  // При выключении - очищаем
                  setSelectedForMerge(new Set());
                }
                setMergeMode(!mergeMode);
              }}>
                <Merge className="h-4 w-4 mr-1" />
                {mergeMode ? "Отмена объединения" : "Объединить"}
              </Button>
              {stats.selected > 0 && !mergeMode && (
                <Button variant="outline" size="sm" onClick={excludeSelected}>
                  <X className="h-4 w-4 mr-1" />
                  Исключить выбранные ({stats.selected})
                </Button>
              )}
              {stats.excluded > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setOperations(prev => prev.map(op => ({ ...op, excluded: false })))}>
                  Вернуть исключённые ({stats.excluded})
                </Button>
              )}
              <div className="ml-auto">
                <Button variant="ghost" size="sm" onClick={resetForNewFile}>
                  Загрузить другой файл
                </Button>
              </div>
            </div>

            {/* Объединённые операции */}
            {mergedOperations.length > 0 && (
              <div className="rounded-lg border-2 border-primary/30 bg-primary/5">
                <button 
                  type="button"
                  onClick={() => setIsMergedCollapsed(!isMergedCollapsed)}
                  className="w-full p-3 flex items-center justify-between hover:bg-primary/10 transition-colors rounded-t-lg"
                >
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Merge className="h-4 w-4" />
                    Объединённые операции ({mergedOperations.length})
                    {mergeMode && <span className="text-xs text-muted-foreground ml-2">— выберите для вычитания</span>}
                  </p>
                  {isMergedCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
                {!isMergedCollapsed && (
                  <div className="px-3 pb-3">
                    <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto">
                      {mergedOperations.map(m => (
                        <div 
                          key={m.id} 
                          onClick={mergeMode ? () => toggleMergedSelect(m.id) : undefined}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                            m.amount >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
                            mergeMode && "cursor-pointer hover:ring-2 hover:ring-primary",
                            selectedMergedForCombine.has(m.id) && "ring-2 ring-primary ring-offset-2 scale-105"
                          )}
                        >
                          {mergeMode && (
                            <Checkbox 
                              checked={selectedMergedForCombine.has(m.id)}
                              onCheckedChange={() => toggleMergedSelect(m.id)}
                              className="h-4 w-4"
                            />
                          )}
                          <span className="text-xs opacity-70">{m.date}</span>
                          <span className="font-medium">{m.categoryName}</span>
                          {m.productName && (
                            <span className="text-xs bg-white/50 px-1.5 py-0.5 rounded">📦 {m.productName}</span>
                          )}
                          <span className="font-bold">{formatMoney(m.amount)}</span>
                          {!mergeMode && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteMerged(m.id); }}
                              className="ml-1 hover:bg-white/50 rounded p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Режим объединения */}
            {mergeMode && (() => {
              // Проверяем можно ли вычесть расходы из доходов (только объединённые, есть и + и -)
              const selectedMergedOps = mergedOperations.filter(m => selectedMergedForCombine.has(m.id));
              const hasIncome = selectedMergedOps.some(m => m.amount >= 0);
              const hasExpense = selectedMergedOps.some(m => m.amount < 0);
              const canSubtract = selectedForMerge.size === 0 && selectedMergedForCombine.size >= 2 && hasIncome && hasExpense;
              
              return (
                <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                  <p className="text-sm font-medium">
                    {canSubtract 
                      ? "Расходы будут вычтены из дохода:"
                      : `Выберите операции из списка ${mergedOperations.length > 0 ? "и/или объединённые выше" : ""}, затем категорию:`
                    }
                  </p>
                  <div className="flex flex-wrap gap-2 items-center">
                    {(selectedForMerge.size > 0 || selectedMergedForCombine.size > 0) && (
                      <div className={cn(
                        "px-3 py-2 rounded-lg font-bold",
                        mergeTotal >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        Итого: {formatMoney(mergeTotal)}
                      </div>
                    )}
                    {!canSubtract && (
                      <>
                        <Select value={mergeCategory} onValueChange={(v) => {
                          setMergeCategory(v);
                          // Автоматически выбираем первый товар этой категории
                          // Если у товара указан тип - проверяем совпадение, иначе берём любой
                          const targetType = mergeTotal >= 0 ? "income" : "expense";
                          const firstProduct = products.find(p => 
                            p.category_id === v && (!p.category_type || p.category_type === targetType)
                          );
                          if (firstProduct) setMergeProduct(firstProduct.id);
                          else setMergeProduct("");
                        }}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Категория..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(() => {
                              const isIncome = mergeTotal >= 0;
                              const filteredCats = isIncome ? incomeCategories : expenseCategories;
                              return filteredCats.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ));
                            })()}
                          </SelectContent>
                        </Select>
                        {mergeCategory && products.length > 0 && (() => {
                          // Фильтруем товары по категории
                          const targetType = mergeTotal >= 0 ? "income" : "expense";
                          const filteredProducts = products.filter(p => {
                            // Проверяем категорию
                            const matchesCategory = p.category_id === mergeCategory;
                            if (!matchesCategory) return false;
                            // Если у товара указан тип - фильтруем по нему
                            // Если тип не указан (null) - показываем всегда
                            if (p.category_type && p.category_type !== targetType) return false;
                            return true;
                          });
                          
                          if (filteredProducts.length === 0) return null;
                          
                          return (
                            <Select value={mergeProduct} onValueChange={setMergeProduct}>
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Товар (опционально)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Без товара</SelectItem>
                                {filteredProducts.map(p => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          );
                        })()}
                      </>
                    )}
                    <Button 
                      disabled={canSubtract ? false : ((selectedForMerge.size < 1 && selectedMergedForCombine.size < 1) || !mergeCategory)}
                      onClick={handleMerge}
                    >
                      {canSubtract ? (
                        <>
                          <Merge className="h-4 w-4 mr-1" />
                          Вычесть расходы из дохода
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          {selectedMergedForCombine.size > 0 ? "Объединить всё" : "Добавить в объединённые"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* Список операций */}
            <div className="flex-1 overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left w-10"></th>
                    <th className="p-2 text-left">Дата</th>
                    <th className="p-2 text-left">Описание</th>
                    <th className="p-2 text-left">Банк. категория</th>
                    <th className="p-2 text-right">Сумма</th>
                    <th className="p-2 text-left w-48">Категория</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {groupedOperations.map((group) => (
                    <Fragment key={`group-${group.description}`}>
                      {/* Если группа > 1, показываем заголовок группы */}
                      {group.count > 1 && (
                        <tr className="bg-muted/20">
                          <td className="p-2">
                            <Checkbox
                              checked={group.operations.every(op => op.selected)}
                              onCheckedChange={() => toggleSelectGroup(group.description)}
                            />
                          </td>
                          <td colSpan={2} className="p-2 font-medium">
                            {group.description} 
                            <span className="ml-2 text-xs text-muted-foreground">({group.count} операций)</span>
                          </td>
                          <td className="p-2"></td>
                          <td className={cn("p-2 text-right font-bold", group.totalAmount >= 0 ? "text-green-600" : "text-red-600")}>
                            {formatMoney(group.totalAmount)}
                          </td>
                          <td className="p-2"></td>
                        </tr>
                      )}
                      {/* Операции */}
                      {group.operations.map((op) => (
                        <tr key={op.id} className={cn("hover:bg-muted/30", op.excluded && "opacity-30")}>
                          <td className="p-2">
                            {mergeMode ? (
                              <Checkbox
                                checked={selectedForMerge.has(op.id)}
                                onCheckedChange={() => toggleMergeSelect(op.id)}
                              />
                            ) : (
                              <Checkbox
                                checked={op.selected}
                                onCheckedChange={() => toggleSelect(op.id)}
                              />
                            )}
                          </td>
                          <td className="p-2 text-muted-foreground whitespace-nowrap">{op.date}</td>
                          <td className="p-2">{op.description}</td>
                          <td className="p-2 text-muted-foreground text-xs">{op.originalCategory}</td>
                          <td className={cn("p-2 text-right font-medium whitespace-nowrap", op.amount >= 0 ? "text-green-600" : "text-red-600")}>
                            {formatMoney(op.amount)}
                          </td>
                          <td className="p-2">
                            <Select 
                              value={categoryAssignments.get(op.id) || ""} 
                              onValueChange={(v) => assignCategory(op.id, v)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Выбрать..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Без категории</SelectItem>
                                {(op.amount >= 0 ? incomeCategories : expenseCategories).map(cat => (
                                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Кнопки */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-sm text-muted-foreground space-y-1">
                {mergedOperations.length > 0 && (
                  <div>Объединённых: <span className="font-medium">{mergedOperations.length}</span></div>
                )}
                {stats.selected > 0 && (
                  <div>Выбрано отдельных: {stats.selected} на сумму <span className="font-medium">{formatMoney(stats.selectedAmount)}</span></div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
                <Button 
                  onClick={handleImport} 
                  disabled={(stats.selected === 0 && mergedOperations.length === 0) || importing}
                >
                  {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Создать транзакции ({stats.selected + mergedOperations.length})
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
