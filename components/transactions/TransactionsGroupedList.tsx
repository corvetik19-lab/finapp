"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/components/toast/ToastContext";
import { deleteTransactionAction, updateTransactionFromValues, duplicateTransactionAction } from "@/app/(protected)/finance/transactions/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, ArrowLeftRight, Copy, Trash2, Pencil, Loader2, FileText, Calendar, CreditCard, Tag, StickyNote, Info, Paperclip } from "lucide-react";
import {
  transactionEditFormSchema,
  type TransactionEditFormValues,
} from "@/lib/validation/transaction";
import { formatMoney } from "@/lib/utils/format";
import { AttachmentsList } from "@/components/transactions/AttachmentsList";
import { FileUpload } from "@/components/transactions/FileUpload";
import { FileViewerModal } from "@/components/transactions/FileViewerModal";
import { getTransactionItems } from "@/lib/transactions/transaction-items-service";
import { calculateTotalFromItems } from "@/lib/transactions/transaction-items-utils";
import type { TransactionItem, TransactionItemInput } from "@/types/transaction";
import { TransactionItems } from "@/components/transactions/TransactionItems";

export type Txn = {
  id: string;
  occurred_at: string;
  amount: number;
  currency: string;
  direction: "income" | "expense" | "transfer" | string;
  note: string | null;
  counterparty: string | null;
  category_id: string | null;
  account_id?: string | null;
  tags?: unknown;
  attachment_count?: number | null;
  transfer_id?: string | null;
  transfer_role?: "expense" | "income" | null;
  transfer_from_account_id?: string | null;
  transfer_to_account_id?: string | null;
};

export type Category = { id: string; name: string; kind: "income" | "expense" | "transfer" | "both" };
export type Account = { id: string; name: string; currency: string };

type Group = {
  category: Category | undefined;
  txns: Txn[];
  total: number;
};

function formatAmountInput(minor: number) {
  const amount = minor / 100;
  // Убираем лишние нули после запятой
  return amount % 1 === 0 ? amount.toFixed(0) : amount.toString();
}

type TransactionsGroupedListProps = {
  txns: Txn[];
  categories: Category[];
  accounts: Account[];
};

export default function TransactionsGroupedList({
  txns,
  categories,
  accounts,
}: TransactionsGroupedListProps) {
  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);

  const [clientTxns, setClientTxns] = useState(txns);

  useEffect(() => {
    setClientTxns(txns);
  }, [txns]);

  // Находим ID категории "Такси" для специальной обработки
  const taxiCategoryId = useMemo(() => {
    const taxiCat = categories.find(c => c.name.toLowerCase() === "такси");
    return taxiCat?.id || null;
  }, [categories]);

  const byDir = useMemo(() => {
    const buckets: Record<string, Txn[]> = {};
    for (const txn of clientTxns) {
      if (txn.direction !== "income" && txn.direction !== "expense" && txn.direction !== "transfer") continue;
      const key = `${txn.direction}|${txn.category_id || "uncat"}`;
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(txn);
    }

    const grouped: Record<"income" | "expense" | "transfer", Group[]> = { income: [], expense: [], transfer: [] };
    for (const [key, list] of Object.entries(buckets)) {
      const [dir, catId] = key.split("|") as ["income" | "expense" | "transfer", string];
      const sorted = [...list].sort(
        (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
      );
      grouped[dir].push({
        category: catId === "uncat" ? undefined : catMap[catId],
        txns: sorted,
        total: sorted.reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0),
      });
    }

    for (const dir of ["income", "expense", "transfer"] as const) {
      grouped[dir].sort((a, b) => {
        const an = a.category?.name || "Без категории";
        const bn = b.category?.name || "Без категории";
        return an.localeCompare(bn, "ru");
      });
    }

    return grouped;
  }, [clientTxns, catMap]);

  // Специальная логика для Такси: чистый доход = доход - расход
  const taxiIncome = useMemo(() => {
    const taxiIncomeGroup = byDir.income.find(g => g.category?.id === taxiCategoryId);
    return taxiIncomeGroup?.total || 0;
  }, [byDir, taxiCategoryId]);

  const taxiExpense = useMemo(() => {
    const taxiExpenseGroup = byDir.expense.find(g => g.category?.id === taxiCategoryId);
    return taxiExpenseGroup?.total || 0;
  }, [byDir, taxiCategoryId]);

  const taxiNetIncome = taxiIncome - taxiExpense; // Чистый доход такси

  // Общий доход: все доходы, но Такси заменяем на чистый доход
  const incomeTotal = useMemo(() => {
    const otherIncome = byDir.income
      .filter(g => g.category?.id !== taxiCategoryId)
      .reduce((sum, group) => sum + group.total, 0);
    return otherIncome + Math.max(0, taxiNetIncome); // Добавляем чистый доход такси (если положительный)
  }, [byDir, taxiCategoryId, taxiNetIncome]);

  // Общий расход: все расходы КРОМЕ Такси (такси расход - это затраты на работу, не личные расходы)
  const expenseTotal = useMemo(() => {
    return byDir.expense
      .filter(g => g.category?.id !== taxiCategoryId)
      .reduce((sum, group) => sum + group.total, 0);
  }, [byDir, taxiCategoryId]);
  const transferTotal = useMemo(() => byDir.transfer.reduce((sum, group) => sum + group.total, 0), [byDir]);

  const [openDir, setOpenDir] = useState<{ income: boolean; expense: boolean; transfer: boolean }>({ income: true, expense: true, transfer: true });
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Txn | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const { show: showToast } = useToast();
  const router = useRouter();
  const [removingIds, setRemovingIds] = useState<Record<string, boolean>>({});
  const [viewingFile, setViewingFile] = useState<{
    fileName: string;
    fileUrl: string;
    mimeType: string | null;
  } | null>(null);
  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [editingItems, setEditingItems] = useState<TransactionItem[]>([]);
  const [, setEditClosing] = useState(false);
  const [, setViewClosing] = useState(false);

  const [isSaving, startSaving] = useTransition();
  const [isDuplicating, startDuplicating] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransactionEditFormValues>({
    resolver: zodResolver(transactionEditFormSchema),
    mode: "onSubmit",
    defaultValues: {
      id: "",
      direction: "expense",
      account_id: "",
      category_id: "",
      amount_major: "",
      currency: "RUB",
      occurred_at: "",
      note: "",
      counterparty: "",
    },
  });

  const amountValue = watch("amount_major");

  const directionValue = watch("direction");
  const accountValue = watch("account_id");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      
      // Не закрываем модалку, если фокус в поле ввода
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      
      if (editMode) {
        setEditClosing(true);
        setTimeout(() => {
          setSelected(null);
          setEditMode(false);
          setEditClosing(false);
          reset();
        }, 180);
      } else if (selected) {
        setViewClosing(true);
        setTimeout(() => {
          setSelected(null);
          setViewClosing(false);
        }, 180);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editMode, selected, reset]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("txn_open_dir");
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<typeof openDir>;
        setOpenDir((prev) => ({
          income: typeof parsed.income === "boolean" ? parsed.income : prev.income,
          expense: typeof parsed.expense === "boolean" ? parsed.expense : prev.expense,
          transfer: typeof parsed.transfer === "boolean" ? parsed.transfer : prev.transfer,
        }));
      }
    } catch { /* ignore */ }
    try {
      const storedCats = localStorage.getItem("txn_open_cats");
      if (storedCats) setOpenCats(JSON.parse(storedCats) || {});
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!selected || !editMode) return;
    reset({
      id: selected.id,
      direction: selected.direction === "income" ? "income" : "expense",
      account_id: selected.account_id ?? "",
      category_id: selected.category_id ?? "",
      amount_major: formatAmountInput(selected.amount),
      currency: selected.currency,
      occurred_at: selected.occurred_at.slice(0, 16),
      note: selected.note ?? "",
      counterparty: selected.counterparty ?? "",
    });
  }, [selected, editMode, reset]);

  useEffect(() => {
    if (!editMode || !accountValue) return;
    const account = accounts.find((a) => a.id === accountValue);
    if (account) setValue("currency", account.currency, { shouldDirty: true });
  }, [accountValue, accounts, editMode, setValue]);


  // Загружаем позиции товаров при выборе транзакции
  useEffect(() => {
    if (!selected) {
      setTransactionItems([]);
      setEditingItems([]);
      return;
    }
    
    if (editMode) {
      // В режиме редактирования загружаем позиции для редактирования
      setLoadingItems(true);
      getTransactionItems(selected.id)
        .then((items) => {
          setEditingItems(items);
          setTransactionItems([]);
        })
        .catch((error) => {
          console.error("Failed to load transaction items for editing:", error);
          setEditingItems([]);
        })
        .finally(() => setLoadingItems(false));
    } else {
      // В режиме просмотра загружаем позиции для отображения
      setLoadingItems(true);
      getTransactionItems(selected.id)
        .then((items) => {
          setTransactionItems(items);
          setEditingItems([]);
        })
        .catch((error) => {
          console.error("Failed to load transaction items:", error);
          setTransactionItems([]);
        })
        .finally(() => setLoadingItems(false));
    }
  }, [selected, editMode]);

  function toggleDir(dir: "income" | "expense" | "transfer") {
    setOpenDir((prev) => {
      const next = { ...prev, [dir]: !prev[dir] } as typeof prev;
      try {
        localStorage.setItem("txn_open_dir", JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }

  function toggleCat(dir: "income" | "expense" | "transfer", catId: string) {
    const key = `${dir}|${catId}`;
    setOpenCats((prev) => {
      const next = { ...prev, [key]: !prev[key] } as Record<string, boolean>;
      try {
        localStorage.setItem("txn_open_cats", JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }

  function closeView() {
    setViewClosing(true);
    setTimeout(() => {
      setSelected(null);
      setViewClosing(false);
    }, 180);
  }

  function closeEdit() {
    setEditClosing(true);
    setTimeout(() => {
      setSelected(null);
      setEditMode(false);
      setEditClosing(false);
      reset();
    }, 180);
  }

  const handleEditSubmit = handleSubmit((values) => {
    startSaving(async () => {
      const normalized: TransactionEditFormValues = {
        ...values,
        category_id: values.category_id || "",
        amount_major: values.amount_major.replace(/\s+/g, "").replace(/,/g, "."),
      };
      
      // Преобразуем editingItems в TransactionItemInput (убираем поля id, transaction_id, user_id, created_at, updated_at)
      const itemsToSave: TransactionItemInput[] = editingItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        price_per_unit: item.price_per_unit,
        total_amount: item.total_amount,
        product_id: item.product_id || null,
      }));
      
      const result = await updateTransactionFromValues(normalized, itemsToSave);
      if (!result.ok) {
        showToast(`❌ Ошибка: ${result.error || "Не удалось сохранить"}`, { type: "error" });
        return;
      }
      showToast("✅ Транзакция успешно обновлена", { type: "success" });
      router.refresh();
      closeEdit();
    });
  });

  type DirBlockProps = {
    dir: "income" | "expense" | "transfer";
    groups: Group[];
    total: number;
    open: boolean;
    toggleDir: (dir: "income" | "expense" | "transfer") => void;
    openCats: Record<string, boolean>;
    toggleCat: (dir: "income" | "expense" | "transfer", catId: string) => void;
    setSelected: React.Dispatch<React.SetStateAction<Txn | null>>;
    setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
    setEditKey: React.Dispatch<React.SetStateAction<number>>;
    setRemovingIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    removingIds: Record<string, boolean>;
  };

  function DirBlock({
    dir,
    groups,
    total,
    open,
    toggleDir,
    openCats,
    toggleCat,
    setSelected,
    setEditMode,
    setEditKey,
    setRemovingIds,
    removingIds,
  }: DirBlockProps) {
    const totalCurrency = groups[0]?.txns[0]?.currency || "RUB";
    const dirColors = {
      income: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", icon: "bg-green-100" },
      expense: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: "bg-red-100" },
      transfer: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: "bg-blue-100" },
    };
    const colors = dirColors[dir];

    return (
      <Collapsible open={open} onOpenChange={() => toggleDir(dir)} className="mb-4">
        <CollapsibleTrigger className={cn("w-full flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50", colors.bg, colors.border)}>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium">{dir === "income" ? "Доход" : dir === "expense" ? "Расход" : "Переводы"}</span>
          <span className="flex-1" />
          <span className={cn("font-semibold", colors.text)}>
            {dir === "income" ? "+" : ""}{formatMoney(dir === "expense" ? -total : total, totalCurrency)}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-2 mt-2 space-y-2">
          {groups.map((group) => {
            const catId = group.category?.id || "uncat";
            const key = `${dir}|${catId}`;
            const catName = group.category?.name || "Без категории";
            const catCurrency = group.txns[0]?.currency || "RUB";
            const catOpen = openCats[key] ?? false;

            return (
              <Collapsible key={key} open={catOpen} onOpenChange={() => toggleCat(dir, catId)}>
                <CollapsibleTrigger className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer text-sm">
                  {catOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  <span>{catName}</span>
                  <span className="flex-1" />
                  <span className={cn("text-sm font-medium", colors.text)}>
                    {dir === "income" ? "+" : ""}{formatMoney(dir === "expense" ? -group.total : group.total, catCurrency)}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 space-y-1 mt-1">
                  {group.txns.map((txn) => (
                    <div
                      key={txn.id}
                      className={cn("flex items-center gap-3 p-2 rounded-md border bg-card hover:bg-muted/50 cursor-pointer transition-all", removingIds[txn.id] && "opacity-50")}
                      onClick={() => { setSelected(txn); setEditMode(false); }}
                    >
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", colors.icon)}>
                        {dir === "transfer" ? <ArrowLeftRight className={cn("h-4 w-4", colors.text)} /> : dir === "income" ? <ArrowUp className={cn("h-4 w-4", colors.text)} /> : <ArrowDown className={cn("h-4 w-4", colors.text)} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{dir === "transfer" ? "Перевод" : txn.transfer_id ? (txn.transfer_role === "expense" ? "Перевод (списание)" : "Перевод (зачисление)") : txn.counterparty || txn.note || "Без названия"}</div>
                        <div className="text-xs text-muted-foreground">{dir === "transfer" && txn.note ? `${txn.note} • ` : ""}{new Date(txn.occurred_at).toLocaleString("ru-RU")}</div>
                      </div>
                      <div className={cn("font-semibold text-sm whitespace-nowrap", colors.text)}>{dir === "income" ? "+" : dir === "expense" ? "−" : ""}{formatMoney(Math.abs(txn.amount), txn.currency)}</div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Дублировать" disabled={isDuplicating} onClick={(e) => { e.preventDefault(); startDuplicating(async () => { const r = await duplicateTransactionAction(txn.id); if (r.ok) { showToast("✅ Дублировано", { type: "success" }); router.refresh(); } else showToast(`❌ ${r.error}`, { type: "error" }); }); }}><Copy className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Удалить" disabled={removingIds[txn.id]} onClick={async (e) => { e.preventDefault(); if (!confirm("Удалить?")) return; const id = txn.id; setRemovingIds(p => ({ ...p, [id]: true })); try { const fd = new FormData(); fd.append("id", id); const r = await deleteTransactionAction({ ok: false }, fd); if (r.ok) { showToast("✅ Удалено", { type: "success" }); setClientTxns(p => p.filter(i => i.id !== id)); setRemovingIds(p => { const n = { ...p }; delete n[id]; return n; }); if (selected?.id === id) setSelected(null); router.refresh(); } else { showToast(`❌ ${r.error}`, { type: "error" }); setRemovingIds(p => { const n = { ...p }; delete n[id]; return n; }); } } catch (err) { showToast(`❌ ${err instanceof Error ? err.message : "Ошибка"}`, { type: "error" }); setRemovingIds(p => { const n = { ...p }; delete n[id]; return n; }); } }}><Trash2 className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Редактировать" onClick={() => { setSelected(txn); setEditMode(true); setEditKey(p => p + 1); }}><Pencil className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className="space-y-4">
      <DirBlock dir="income" groups={byDir.income} total={incomeTotal} open={openDir.income} toggleDir={toggleDir} openCats={openCats} toggleCat={toggleCat} setSelected={setSelected} setEditMode={setEditMode} setEditKey={setEditKey} setRemovingIds={setRemovingIds} removingIds={removingIds} />
      <DirBlock dir="expense" groups={byDir.expense} total={expenseTotal} open={openDir.expense} toggleDir={toggleDir} openCats={openCats} toggleCat={toggleCat} setSelected={setSelected} setEditMode={setEditMode} setEditKey={setEditKey} setRemovingIds={setRemovingIds} removingIds={removingIds} />
      <DirBlock dir="transfer" groups={byDir.transfer} total={transferTotal} open={openDir.transfer} toggleDir={toggleDir} openCats={openCats} toggleCat={toggleCat} setSelected={setSelected} setEditMode={setEditMode} setEditKey={setEditKey} setRemovingIds={setRemovingIds} removingIds={removingIds} />

      {viewingFile && <FileViewerModal fileName={viewingFile.fileName} fileUrl={viewingFile.fileUrl} mimeType={viewingFile.mimeType} onClose={() => setViewingFile(null)} />}

      {/* Модалка просмотра транзакции */}
      <Dialog open={!editMode && !!selected} onOpenChange={(v) => !v && closeView()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.direction === "transfer" ? <ArrowLeftRight className="h-5 w-5 text-blue-600" /> : selected.direction === "income" ? <ArrowUp className="h-5 w-5 text-green-600" /> : <ArrowDown className="h-5 w-5 text-red-600" />}
                  <span className={cn("text-xl font-bold", selected.direction === "income" ? "text-green-600" : selected.direction === "expense" ? "text-red-600" : "text-blue-600")}>
                    {selected.direction === "income" ? "+" : selected.direction === "expense" ? "−" : ""}{formatMoney(Math.abs(selected.amount), selected.currency)}
                  </span>
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                  <div className="text-sm font-medium text-muted-foreground">Детали</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" />Название</span><span className="font-medium">{selected.counterparty || selected.note || "Без названия"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" />Категория</span><span>{selected.direction === "transfer" ? "—" : selected.category_id ? catMap[selected.category_id]?.name ?? "(удалена)" : "Без категории"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1">{selected.direction === "income" ? <ArrowUp className="h-3 w-3" /> : selected.direction === "transfer" ? <ArrowLeftRight className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}Тип</span><span>{selected.direction === "income" ? "Доход" : selected.direction === "expense" ? "Расход" : "Перевод"}</span></div>
                    {selected.note && selected.note.trim() !== "" && <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><StickyNote className="h-3 w-3" />Заметка</span><span className="text-right max-w-[200px] truncate">{selected.note}</span></div>}
                  </div>
                </div>
                <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                  <div className="text-sm font-medium text-muted-foreground">Параметры</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Дата</span><span>{new Date(selected.occurred_at).toLocaleString("ru-RU")}</span></div>
                    {selected.direction === "transfer" ? (
                      <>
                        <div className="flex justify-between"><span className="text-muted-foreground">Со счёта</span><span>{selected.transfer_from_account_id ? accMap[selected.transfer_from_account_id]?.name || "(удалён)" : "—"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">На счёт</span><span>{selected.transfer_to_account_id ? accMap[selected.transfer_to_account_id]?.name || "(удалён)" : "—"}</span></div>
                      </>
                    ) : (
                      <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3" />Счёт</span><span>{selected.account_id ? accMap[selected.account_id!]?.name || "(удалён)" : "—"}</span></div>
                    )}
                  </div>
                </div>
              </div>
              {transactionItems.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Позиции товаров</div>
                  <div className="space-y-1">{transactionItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 rounded border bg-muted/30 text-sm">
                      <span>🛒</span><div className="flex-1"><div className="font-medium">{item.name}</div><div className="text-xs text-muted-foreground">{item.quantity} {item.unit} × {formatMoney(item.price_per_unit, selected.currency)}</div></div><div className="font-medium">{formatMoney(item.total_amount, selected.currency)}</div>
                    </div>
                  ))}</div>
                  <div className="flex justify-between text-sm font-medium pt-2 border-t"><span>Итого:</span><span>{formatMoney(transactionItems.reduce((s, i) => s + i.total_amount, 0), selected.currency)}</span></div>
                </div>
              )}
              {loadingItems && <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Загрузка позиций...</div>}
              <div className="space-y-2"><div className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Paperclip className="h-3 w-3" />Вложения</div><AttachmentsList transactionId={selected.id} onViewFile={(file) => setViewingFile(file)} /></div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Модалка редактирования транзакции */}
      <Dialog open={editMode && !!selected} onOpenChange={(v) => !v && closeEdit()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Pencil className="h-5 w-5" />Редактирование
                  <span className={cn("ml-2 text-lg font-bold", directionValue === "income" ? "text-green-600" : directionValue === "expense" ? "text-red-600" : "text-blue-600")}>
                    {directionValue === "income" ? "+" : directionValue === "expense" ? "−" : ""}{formatMoney(amountValue ? Math.round(parseFloat(amountValue.replace(/\s/g, '').replace(',', '.') || "0") * 100) : 0, selected.currency)}
                  </span>
                </DialogTitle>
              </DialogHeader>
              <form key={editKey} onSubmit={handleEditSubmit} className="space-y-4">
                {selected.direction === "transfer" && (
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-blue-50 text-blue-700 text-sm"><Info className="h-4 w-4" /><span>Для переводов можно изменить только дату и заметку</span></div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label>Тип</Label>
                    <Select value={directionValue} onValueChange={(v) => setValue("direction", v as "income" | "expense")} disabled={selected.direction === "transfer"}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="income">Доход</SelectItem><SelectItem value="expense">Расход</SelectItem><SelectItem value="transfer">Перевод</SelectItem></SelectContent>
                    </Select>
                    <Label>Сумма (₽)</Label>
                    <Input type="text" inputMode="decimal" value={amountValue} onChange={(e) => setValue("amount_major", e.target.value)} readOnly className="bg-muted/50" />
                    {errors.amount_major?.message && <p className="text-xs text-destructive">{errors.amount_major.message}</p>}
                  </div>
                  <div className="space-y-3">
                    <Label>Дата</Label>
                    <Input {...register("occurred_at")} type="datetime-local" />
                    {errors.occurred_at && <p className="text-xs text-destructive">{errors.occurred_at.message}</p>}
                    <Label>Счёт</Label>
                    <Select value={watch("account_id") || ""} onValueChange={(v) => setValue("account_id", v)} disabled={selected.direction === "transfer"}>
                      <SelectTrigger><SelectValue placeholder="— выберите —" /></SelectTrigger>
                      <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Label>Название</Label>
                    <Input {...register("counterparty")} placeholder="Например: Магнит" />
                    <Label>Заметка</Label>
                    <Input {...register("note")} placeholder="Комментарий" />
                  </div>
                </div>
                <input type="hidden" {...register("id")} />
                <input type="hidden" {...register("currency")} />
                <div className="space-y-2">
                  <TransactionItems items={editingItems.map((item) => ({ id: item.id, name: item.name, quantity: item.quantity, unit: item.unit, price_per_unit: item.price_per_unit, total_amount: item.total_amount, product_id: item.product_id || null }))} onChange={(items) => { const updatedItems: TransactionItem[] = items.map((item, index) => { const existingItem = item.id ? editingItems.find(ei => ei.id === item.id) : undefined; return { id: item.id || existingItem?.id || `temp-${Date.now()}-${index}`, transaction_id: selected.id, user_id: "", name: item.name, quantity: item.quantity, unit: item.unit, price_per_unit: item.price_per_unit, total_amount: item.total_amount || Math.round(item.quantity * item.price_per_unit), product_id: item.product_id || existingItem?.product_id || null, created_at: existingItem?.created_at || new Date().toISOString(), updated_at: new Date().toISOString() }; }); setEditingItems(updatedItems); if (items.length > 0) { const totalMinor = calculateTotalFromItems(items); setValue("amount_major", (totalMinor / 100).toFixed(2), { shouldValidate: true, shouldDirty: true }); const itemWithCategory = [...items].reverse().find(item => 'category_id' in item && item.category_id); if (itemWithCategory && itemWithCategory.category_id) setValue("category_id", itemWithCategory.category_id, { shouldValidate: true, shouldDirty: true }); } else setValue("amount_major", "", { shouldValidate: true, shouldDirty: true }); }} currency={selected.currency} direction={selected.direction === "transfer" ? undefined : (selected.direction as "income" | "expense")} />
                </div>
                <div className="space-y-2"><div className="text-sm font-medium">Вложения</div><FileUpload transactionId={selected.id} maxSizeMB={10} /><div className="mt-2"><AttachmentsList transactionId={selected.id} onViewFile={(file) => setViewingFile(file)} /></div></div>
                <DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={closeEdit}>Отмена</Button><Button type="submit" disabled={isSaving}>{isSaving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Сохраняем…</> : "Сохранить"}</Button></DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
