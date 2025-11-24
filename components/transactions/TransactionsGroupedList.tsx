"use client";

import {
  useMemo,
  useState,
  useEffect,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/components/toast/ToastContext";
import styles from "@/components/transactions/Transactions.module.css";
import {
  deleteTransactionAction,
  updateTransactionFromValues,
  duplicateTransactionAction,
} from "@/app/(protected)/finance/transactions/actions";
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

  const incomeTotal = useMemo(() => byDir.income.reduce((sum, group) => sum + group.total, 0), [byDir]);
  const expenseTotal = useMemo(() => byDir.expense.reduce((sum, group) => sum + group.total, 0), [byDir]);
  const transferTotal = useMemo(() => byDir.transfer.reduce((sum, group) => sum + group.total, 0), [byDir]);

  const [openDir, setOpenDir] = useState<{ income: boolean; expense: boolean; transfer: boolean }>({ income: true, expense: true, transfer: true });
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Txn | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [viewClosing, setViewClosing] = useState(false);
  const [editClosing, setEditClosing] = useState(false);
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
    } catch {}
    try {
      const storedCats = localStorage.getItem("txn_open_cats");
      if (storedCats) setOpenCats(JSON.parse(storedCats) || {});
    } catch {}
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
      } catch {}
      return next;
    });
  }

  function toggleCat(dir: "income" | "expense" | "transfer", catId: string) {
    const key = `${dir}|${catId}`;
    setOpenCats((prev) => {
      const next = { ...prev, [key]: !prev[key] } as Record<string, boolean>;
      try {
        localStorage.setItem("txn_open_cats", JSON.stringify(next));
      } catch {}
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
    return (
      <div className={styles.groupBlock}>
        <div
          className={`${styles.groupHeader} ${dir === "income" ? styles.income : dir === "expense" ? styles.expense : styles.transfer}`}
          onClick={() => toggleDir(dir)}
        >
          <span className={styles.chevron}>{open ? "▾" : "▸"}</span>
          <span className={styles.groupTitle}>{dir === "income" ? "Доход" : dir === "expense" ? "Расход" : "Переводы"}</span>
          <span className={styles.spacer} />
          <span className={`${styles.groupTotal} ${dir === "income" ? styles.income : dir === "expense" ? styles.expense : styles.transfer}`}>
            {dir === "income" ? "+" : dir === "expense" ? "" : ""}
            {formatMoney(dir === "income" ? total : dir === "expense" ? -total : total, totalCurrency)}
          </span>
        </div>

        {open && (
          <div className={styles.groupBody}>
            {groups.map((group) => {
              const catId = group.category?.id || "uncat";
              const key = `${dir}|${catId}`;
              const catName = group.category?.name || "Без категории";
              const catCurrency = group.txns[0]?.currency || "RUB";
              const catOpen = openCats[key] ?? false;

              return (
                <div key={key} className={styles.subGroup}>
                  <div className={styles.subHeader} onClick={() => toggleCat(dir, catId)}>
                    <span className={styles.chevronSmall}>{catOpen ? "▾" : "▸"}</span>
                    <span className={styles.subTitle}>{catName}</span>
                    <span className={styles.spacer} />
                    <span className={`${styles.subTotal} ${dir === "income" ? styles.income : dir === "expense" ? styles.expense : styles.transfer}`}>
                      {dir === "transfer" ? "" : dir === "income" ? "+" : ""}
                      {formatMoney(dir === "transfer" ? group.total : dir === "income" ? group.total : -group.total, catCurrency)}
                    </span>
                  </div>

                  {catOpen && (
                    <div className={styles.list}>
                      {group.txns.map((txn) => {
                        const signCls =
                          dir === "transfer"
                            ? styles.transfer
                            : dir === "income"
                              ? styles.income
                              : styles.expense;
                        return (
                          <div
                            key={txn.id}
                            className={`${styles.item} ${removingIds[txn.id] ? styles.removing : ""}`}
                            onClick={() => {
                              setSelected(txn);
                              setEditMode(false);
                            }}
                          >
                            <div className={styles.left}>
                              <div className={`${styles.icon} ${signCls}`}>
                                <span className="material-icons" aria-hidden>
                                  {dir === "transfer"
                                    ? "swap_horiz"
                                    : txn.transfer_id
                                      ? "swap_horizontal_circle"
                                      : dir === "income"
                                        ? "arrow_upward"
                                        : "arrow_downward"}
                                </span>
                              </div>
                              <div className={styles.main}>
                                <div className={styles.title}>
                                  {dir === "transfer"
                                    ? "Перевод"
                                    : txn.transfer_id
                                      ? txn.transfer_role === "expense"
                                        ? "Перевод (списание)"
                                        : "Перевод (зачисление)"
                                      : txn.counterparty || txn.note || "Без названия"}
                                </div>
                                <div className={styles.subtitle}>
                                  {dir === "transfer" && txn.note
                                    ? `${txn.note} • `
                                    : ""}
                                  {new Date(txn.occurred_at).toLocaleString("ru-RU")}
                                </div>
                              </div>
                            </div>

                            <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
                              <div className={`${styles.amount} ${signCls}`}>
                                {dir === "transfer" ? "" : dir === "income" ? "+" : "−"}
                                {formatMoney(Math.abs(txn.amount), txn.currency)}
                              </div>

                              <button
                                type="button"
                                className={styles.iconBtn}
                                title="Дублировать"
                                aria-label="Дублировать"
                                disabled={isDuplicating}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  startDuplicating(async () => {
                                    const result = await duplicateTransactionAction(txn.id);
                                    if (result.ok) {
                                      showToast("✅ Транзакция успешно дублирована", { type: "success" });
                                      router.refresh();
                                    } else {
                                      showToast(`❌ Ошибка: ${result.error}`, { type: "error" });
                                    }
                                  });
                                }}
                              >
                                <span className="material-icons" aria-hidden>
                                  content_copy
                                </span>
                              </button>

                              <button
                                type="button"
                                className={styles.iconBtn}
                                title="Удалить"
                                aria-label="Удалить"
                                disabled={removingIds[txn.id]}
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!confirm("Удалить эту транзакцию?")) return;
                                  
                                  const txnId = txn.id;
                                  setRemovingIds((prev) => ({ ...prev, [txnId]: true }));
                                  
                                  try {
                                    const formData = new FormData();
                                    formData.append("id", txnId);
                                    const result = await deleteTransactionAction({ ok: false }, formData);
                                    
                                    if (result.ok) {
                                      showToast("✅ Транзакция успешно удалена", { type: "success" });
                                      setClientTxns((prev) => prev.filter((item) => item.id !== txnId));
                                      setRemovingIds((prev) => {
                                        const next = { ...prev };
                                        delete next[txnId];
                                        return next;
                                      });
                                      if (selected?.id === txnId) {
                                        setSelected(null);
                                      }
                                      router.refresh();
                                    } else {
                                      showToast(`❌ Ошибка: ${result.error}`, { type: "error" });
                                      setRemovingIds((prev) => {
                                        const next = { ...prev };
                                        delete next[txnId];
                                        return next;
                                      });
                                    }
                                  } catch (error) {
                                    showToast(`❌ Ошибка удаления: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`, { type: "error" });
                                    setRemovingIds((prev) => {
                                      const next = { ...prev };
                                      delete next[txnId];
                                      return next;
                                    });
                                  }
                                }}
                              >
                                <span className="material-icons" aria-hidden>
                                  delete
                                </span>
                              </button>

                              <button
                                type="button"
                                className={`${styles.iconBtn} ${styles.edit}`}
                                title="Редактировать"
                                aria-label="Редактировать"
                                onClick={() => {
                                  setSelected(txn);
                                  setEditMode(true);
                                  setEditKey((prev) => prev + 1);
                                }}
                              >
                                <span className="material-icons" aria-hidden>
                                  edit
                                </span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.groupedList}>
      <DirBlock
        dir="income"
        groups={byDir.income}
        total={incomeTotal}
        open={openDir.income}
        toggleDir={toggleDir}
        openCats={openCats}
        toggleCat={toggleCat}
        setSelected={setSelected}
        setEditMode={setEditMode}
        setEditKey={setEditKey}
        setRemovingIds={setRemovingIds}
        removingIds={removingIds}
      />

      <DirBlock
        dir="expense"
        groups={byDir.expense}
        total={expenseTotal}
        open={openDir.expense}
        toggleDir={toggleDir}
        openCats={openCats}
        toggleCat={toggleCat}
        setSelected={setSelected}
        setEditMode={setEditMode}
        setEditKey={setEditKey}
        setRemovingIds={setRemovingIds}
        removingIds={removingIds}
      />

      <DirBlock
        dir="transfer"
        groups={byDir.transfer}
        total={transferTotal}
        open={openDir.transfer}
        toggleDir={toggleDir}
        openCats={openCats}
        toggleCat={toggleCat}
        setSelected={setSelected}
        setEditMode={setEditMode}
        setEditKey={setEditKey}
        setRemovingIds={setRemovingIds}
        removingIds={removingIds}
      />

      {viewingFile && (
        <FileViewerModal
          fileName={viewingFile.fileName}
          fileUrl={viewingFile.fileUrl}
          mimeType={viewingFile.mimeType}
          onClose={() => setViewingFile(null)}
        />
      )}

      {!editMode && selected && (
        <div 
          className={styles.modalOverlay} 
          onClick={(e) => {
            // Закрываем только если клик именно по overlay, а не по его содержимому
            if (e.target === e.currentTarget) {
              closeView();
            }
          }}
        >
          <div
            className={`${styles.modal} ${viewClosing ? styles.closing : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="txnModalTitle"
          >
            <div className={styles.modalBody}>
              <div className={styles.amountHero}>
                <span className={`${styles.badgeAmount} ${selected.direction === "income" ? styles.badgeIncome : selected.direction === "transfer" ? styles.badgeTransfer : styles.badgeExpense}`}>
                  <span className="material-icons" aria-hidden style={{ fontSize: 18 }}>
                    {selected.direction === "income" ? "arrow_upward" : selected.direction === "transfer" ? "swap_horiz" : "arrow_downward"}
                  </span>
                  {selected.direction === "income" ? "+" : selected.direction === "transfer" ? "" : "−"}
                  {formatMoney(Math.abs(selected.amount), selected.currency)}
                </span>
              </div>

              <div className={styles.modalGrid}>
                <div className={styles.modalCol}>
                  <div className={styles.modalSectionTitle}>Детали</div>
                  <div className={styles.sectionCard}>
                    <div className={styles.kv}>
                      <div className={styles.modalRow}>
                        <span className={styles.modalLabel}>
                          <span className={styles.iconMini}>
                            <span className="material-icons" aria-hidden>
                              description
                            </span>
                          </span>
                          Название
                        </span>
                        <span className={styles.modalValue}>{selected.counterparty || selected.note || "Без названия"}</span>
                      </div>

                      <div className={styles.modalRow}>
                        <span className={styles.modalLabel}>
                          <span className={styles.iconMini}>
                            <span className="material-icons" aria-hidden>
                              label
                            </span>
                          </span>
                          Категория
                        </span>
                        <span className={styles.modalValue}>
                          {selected.direction === "transfer"
                            ? "—"
                            : selected.category_id
                            ? catMap[selected.category_id]?.name ?? "(удалена)"
                            : "Без категории"}
                        </span>
                      </div>

                      <div className={styles.modalRow}>
                        <span className={styles.modalLabel}>
                          <span className={styles.iconMini}>
                            <span className="material-icons" aria-hidden>
                              {selected.direction === "income" ? "arrow_upward" : selected.direction === "transfer" ? "swap_horiz" : "arrow_downward"}
                            </span>
                          </span>
                          Тип
                        </span>
                        <span className={styles.modalValue}>
                          {selected.direction === "income"
                            ? "Доход"
                            : selected.direction === "expense"
                            ? "Расход"
                            : selected.direction === "transfer"
                            ? "Перевод"
                            : selected.direction}
                        </span>
                      </div>

                      {selected.note && selected.note.trim() !== "" && (
                        <div className={styles.modalRow}>
                          <span className={styles.modalLabel}>
                            <span className={styles.iconMini}>
                              <span className="material-icons" aria-hidden>
                                notes
                              </span>
                            </span>
                            Заметка
                          </span>
                          <span className={styles.modalValue}>
                            <span className={`${styles.noteBadge} ${styles.noteText}`}>{selected.note}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.modalCol}>
                  <div className={styles.modalSectionTitle}>Параметры</div>
                  <div className={styles.sectionCard}>
                    <div className={styles.kv}>
                      <div className={styles.modalRow}>
                        <span className={styles.modalLabel}>
                          <span className={styles.iconMini}>
                            <span className="material-icons" aria-hidden>
                              event
                            </span>
                          </span>
                          Дата
                        </span>
                        <span className={styles.modalValue}>{new Date(selected.occurred_at).toLocaleString("ru-RU")}</span>
                      </div>

                      {selected.direction === "transfer" ? (
                        <>
                          <div className={styles.modalRow}>
                            <span className={styles.modalLabel}>
                              <span className={styles.iconMini}>
                                <span className="material-icons" aria-hidden>
                                  call_made
                                </span>
                              </span>
                              Со счёта
                            </span>
                            <span className={styles.modalValue}>
                              {selected.transfer_from_account_id 
                                ? accMap[selected.transfer_from_account_id]?.name || "(удалённый счёт)" 
                                : "—"}
                            </span>
                          </div>
                          <div className={styles.modalRow}>
                            <span className={styles.modalLabel}>
                              <span className={styles.iconMini}>
                                <span className="material-icons" aria-hidden>
                                  call_received
                                </span>
                              </span>
                              На счёт
                            </span>
                            <span className={styles.modalValue}>
                              {selected.transfer_to_account_id 
                                ? accMap[selected.transfer_to_account_id]?.name || "(удалённый счёт)" 
                                : "—"}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className={styles.modalRow}>
                          <span className={styles.modalLabel}>
                            <span className={styles.iconMini}>
                              <span className="material-icons" aria-hidden>
                                account_balance_wallet
                              </span>
                            </span>
                            Счёт
                          </span>
                          <span className={styles.modalValue}>
                            {selected.account_id 
                              ? accMap[selected.account_id!]?.name || "(удалённый счёт)" 
                              : "—"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Позиции товаров */}
              {transactionItems.length > 0 && (
                <div className={styles.modalSection}>
                  <div className={styles.modalSectionTitle}>
                    <span className="material-icons" style={{ fontSize: 20, marginRight: 8 }}>shopping_cart</span>
                    Позиции товаров
                  </div>
                  <div className={styles.itemsList}>
                    {transactionItems.map((item) => (
                      <div key={item.id} className={styles.itemRow}>
                        <div className={styles.itemIcon}>🛒</div>
                        <div className={styles.itemContent}>
                          <div className={styles.itemName}>
                            {item.name}
                          </div>
                          <div className={styles.itemDetails}>
                            {item.quantity} {item.unit} × {formatMoney(item.price_per_unit, selected.currency)}
                          </div>
                        </div>
                        <div className={styles.itemTotal}>
                          {formatMoney(item.total_amount, selected.currency)}
                        </div>
                      </div>
                    ))}
                    <div className={styles.itemsTotal}>
                      <span>Итого:</span>
                      <span className={styles.itemsTotalAmount}>
                        {formatMoney(
                          transactionItems.reduce((sum, item) => sum + item.total_amount, 0),
                          selected.currency
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {loadingItems && (
                <div className={styles.modalSection}>
                  <div className={styles.loadingItems}>Загрузка позиций товаров...</div>
                </div>
              )}

              {/* Вложения */}
              <div className={styles.modalSection}>
                <div className={styles.modalSectionTitle}>Вложения</div>
                <AttachmentsList 
                  transactionId={selected.id}
                  onViewFile={(file) => setViewingFile(file)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {selected && editMode && (
        <div 
          className={styles.modalOverlay} 
          onClick={(e) => {
            // Закрываем только если клик именно по overlay, а не по его содержимому
            if (e.target === e.currentTarget) {
              closeEdit();
            }
          }}
        >
          <div
            className={`${styles.modal} ${editClosing ? styles.closing : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="txnEditTitle"
          >
            <div className={styles.modalBody}>
              <div className={styles.amountHero}>
                <span className={`${styles.badgeAmount} ${selected.direction === "income" ? styles.badgeIncome : selected.direction === "transfer" ? styles.badgeTransfer : styles.badgeExpense}`}>
                  <span className="material-icons" aria-hidden style={{ fontSize: 18 }}>
                    {selected.direction === "income" ? "arrow_upward" : selected.direction === "transfer" ? "swap_horiz" : "arrow_downward"}
                  </span>
                  {selected.direction === "income" ? "+" : selected.direction === "transfer" ? "" : "−"}
                  {formatMoney(Math.abs(selected.amount), selected.currency)}
                </span>
              </div>

              <form key={editKey} onSubmit={handleEditSubmit} className={styles.modalForm}>
                {selected.direction === "transfer" && (
                  <div className={styles.infoMessage}>
                    <span className="material-icons" aria-hidden style={{ fontSize: 20 }}>
                      info
                    </span>
                    <span>Для переводов нельзя изменить тип, счёт и сумму. Можно изменить только дату и заметку.</span>
                  </div>
                )}
                <div className={styles.modalGrid}>
                  <div className={styles.modalCol}>
                    <div className={styles.modalSectionTitle}>Основное</div>
                    <div className={styles.sectionCard}>
                      <div className={styles.kv}>
                        <div className={styles.modalRow}>
                          <span className={styles.modalLabel}>
                            <span className={styles.iconMini}>
                              <span className="material-icons" aria-hidden>
                                {directionValue === "income" ? "arrow_upward" : directionValue === "transfer" ? "swap_horiz" : "arrow_downward"}
                              </span>
                            </span>
                            Тип
                          </span>
                          <span className={styles.modalValue}>
                            <select 
                              {...register("direction")} 
                              className={styles.select}
                              disabled={selected.direction === "transfer"}
                            >
                              <option value="income">Доход</option>
                              <option value="expense">Расход</option>
                              <option value="transfer">Перевод</option>
                            </select>
                          </span>
                        </div>

                        <div className={styles.modalRow}>
                          <span className={styles.modalLabel}>
                            <span className={styles.iconMini}>
                              <span className="material-icons" aria-hidden>
                                payments
                              </span>
                            </span>
                            Сумма (₽)
                          </span>
                          <span className={styles.modalValue}>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={amountValue}
                              onChange={(e) => setValue("amount_major", e.target.value)}
                              placeholder="0"
                              className={styles.input}
                              readOnly
                              style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                            />
                            {errors.amount_major?.message && (
                              <span className={styles.error}>{errors.amount_major.message}</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.modalCol}>
                    <div className={styles.modalSectionTitle}>Параметры</div>
                    <div className={styles.sectionCard}>
                      <div className={styles.kv}>
                        <div className={styles.modalRow}>
                          <span className={styles.modalLabel}>
                            <span className={styles.iconMini}>
                              <span className="material-icons" aria-hidden>
                                event
                              </span>
                            </span>
                            Дата
                          </span>
                          <span className={styles.modalValue}>
                            <input
                              {...register("occurred_at")}
                              type="datetime-local"
                              className={styles.input}
                            />
                            {errors.occurred_at && (
                              <div className={styles.fieldError}>{errors.occurred_at.message}</div>
                            )}
                          </span>
                        </div>

                        <div className={styles.modalRow}>
                          <span className={styles.modalLabel}>
                            <span className={styles.iconMini}>
                              <span className="material-icons" aria-hidden>
                                account_balance_wallet
                              </span>
                            </span>
                            Счёт
                          </span>
                          <span className={styles.modalValue}>
                            <select 
                              {...register("account_id")} 
                              className={styles.select}
                              disabled={selected.direction === "transfer"}
                            >
                              <option value="">— выберите —</option>
                              {accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.name}
                                </option>
                              ))}
                            </select>
                            {errors.account_id && (
                              <div className={styles.fieldError}>{errors.account_id.message}</div>
                            )}
                          </span>
                        </div>

                        <div className={styles.modalRow}>
                          <span className={styles.modalLabel}>
                            <span className={styles.iconMini}>
                              <span className="material-icons" aria-hidden>
                                description
                              </span>
                            </span>
                            Название
                          </span>
                          <span className={styles.modalValue}>
                            <input {...register("counterparty")} type="text" className={styles.input} placeholder="Например: Магнит" />
                          </span>
                        </div>

                        <div className={styles.modalRow}>
                          <span className={styles.modalLabel}>
                            <span className={styles.iconMini}>
                              <span className="material-icons" aria-hidden>
                                notes
                              </span>
                            </span>
                            Заметка
                          </span>
                          <span className={styles.modalValue}>
                            <input {...register("note")} type="text" className={styles.input} placeholder="Комментарий" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <input type="hidden" {...register("id")} />
                <input type="hidden" {...register("currency")} />

                {/* Позиции товаров */}
                <div className={styles.modalSection}>
                  <TransactionItems
                    items={editingItems.map((item) => ({
                      id: item.id,
                      name: item.name,
                      quantity: item.quantity,
                      unit: item.unit,
                      price_per_unit: item.price_per_unit,
                      total_amount: item.total_amount,
                      product_id: item.product_id || null,
                    }))}
                    onChange={(items) => {
                      // Обновляем editingItems, используя id для сопоставления
                      const updatedItems: TransactionItem[] = items.map((item, index) => {
                        // Ищем существующий элемент по id, если он есть
                        const existingItem = item.id ? editingItems.find(ei => ei.id === item.id) : undefined;
                        
                        return {
                          id: item.id || existingItem?.id || `temp-${Date.now()}-${index}`,
                          transaction_id: selected.id,
                          user_id: "",
                          name: item.name,
                          quantity: item.quantity,
                          unit: item.unit,
                          price_per_unit: item.price_per_unit,
                          total_amount: item.total_amount || Math.round(item.quantity * item.price_per_unit),
                          product_id: item.product_id || existingItem?.product_id || null,
                          created_at: existingItem?.created_at || new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                        };
                      });
                      setEditingItems(updatedItems);
                      
                      // Автоматически обновляем сумму транзакции
                      if (items.length > 0) {
                        const totalMinor = calculateTotalFromItems(items);
                        const totalMajor = (totalMinor / 100).toFixed(2);
                        setValue("amount_major", totalMajor, { shouldValidate: true, shouldDirty: true });
                        
                        // Обновляем категорию транзакции из любого товара у которого есть category_id
                        // Приоритет: последний добавленный/изменённый товар (он в конце массива)
                        const itemWithCategory = [...items].reverse().find(item => 
                          'category_id' in item && item.category_id
                        );
                        if (itemWithCategory && itemWithCategory.category_id) {
                          setValue("category_id", itemWithCategory.category_id, { shouldValidate: true, shouldDirty: true });
                        }
                      } else {
                        // Если все товары удалены, очищаем сумму
                        setValue("amount_major", "", { shouldValidate: true, shouldDirty: true });
                      }
                    }}
                    currency={selected.currency}
                    direction={selected.direction === "transfer" ? undefined : (selected.direction as "income" | "expense")}
                  />
                </div>

                {/* Загрузка вложений */}
                <div className={styles.modalSection}>
                  <div className={styles.modalSectionTitle}>Вложения</div>
                  <FileUpload 
                    transactionId={selected.id}
                    maxSizeMB={10}
                  />
                  <div style={{ marginTop: '1rem' }}>
                    <AttachmentsList 
                      transactionId={selected.id}
                      onViewFile={(file) => setViewingFile(file)}
                    />
                  </div>
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.btnLight}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      closeEdit();
                    }}
                  >
                    Отмена
                  </button>
                  <button type="submit" className={styles.btnPrimary} disabled={isSaving}>
                    {isSaving ? "Сохраняем…" : "Сохранить"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно просмотра файла */}
      {viewingFile && (
        <FileViewerModal
          fileName={viewingFile.fileName}
          fileUrl={viewingFile.fileUrl}
          mimeType={viewingFile.mimeType}
          onClose={() => setViewingFile(null)}
        />
      )}
    </div>
  );
}
