"use client";

import {
  useMemo,
  useState,
  useEffect,
  useActionState,
  useTransition,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import styles from "@/components/transactions/Transactions.module.css";
import {
  deleteTransactionAction,
  updateTransactionFromValues,
  type DeleteTxnState,
} from "@/app/(protected)/transactions/actions";
import {
  transactionEditFormSchema,
  type TransactionEditFormValues,
} from "@/lib/validation/transaction";
import { formatMoney } from "@/lib/utils/format";
import { AttachmentsList } from "@/components/transactions/AttachmentsList";
import { FileUpload } from "@/components/transactions/FileUpload";
import { FileViewerModal } from "@/components/transactions/FileViewerModal";

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

export type Category = { id: string; name: string; kind: "income" | "expense" | "transfer" };
export type Account = { id: string; name: string; currency: string };

type Group = {
  category: Category | undefined;
  txns: Txn[];
  total: number;
};

function formatAmountInput(minor: number) {
  return (minor / 100).toString();
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

  const byDir = useMemo(() => {
    const buckets: Record<string, Txn[]> = {};
    for (const txn of txns) {
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
        total: sorted.reduce((sum, item) => sum + Number(item.amount), 0),
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
  }, [txns, catMap]);

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
  const [toast, setToast] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Record<string, boolean>>({});
  const [viewingFile, setViewingFile] = useState<{
    fileName: string;
    fileUrl: string;
    mimeType: string | null;
  } | null>(null);

  const [deleteState, deleteAction] = useActionState(deleteTransactionAction, { ok: false } as DeleteTxnState);
  const [isSaving, startSaving] = useTransition();

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

  const directionValue = watch("direction");
  const accountValue = watch("account_id");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
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

  useEffect(() => {
    if (!deleteState) return;
    if (deleteState.error) {
      setToast(`Ошибка удаления: ${deleteState.error}`);
      setRemovingIds({});
      return;
    }
    if (deleteState.ok) {
      setToast("Удалено");
      setRemovingIds({});
    }
  }, [deleteState]);

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
      const result = await updateTransactionFromValues(normalized);
      if (!result.ok) {
        setToast(result.error || "Не удалось сохранить");
        return;
      }
      setToast("Сохранено");
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
    setSelected: (txn: Txn | null) => void;
    setEditMode: (flag: boolean) => void;
    setEditKey: React.Dispatch<React.SetStateAction<number>>;
    setRemovingIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    removingIds: Record<string, boolean>;
    delAction: (formData: FormData) => void;
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
    delAction,
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
                                {dir === "transfer" ? "" : dir === "income" ? "+" : ""}
                                {formatMoney(dir === "transfer" ? txn.amount : dir === "income" ? txn.amount : -txn.amount, txn.currency)}
                              </div>

                              <form
                                action={(fd) => {
                                  if (!confirm("Удалить эту транзакцию?")) return;
                                  setRemovingIds((prev) => ({ ...prev, [txn.id]: true }));
                                  delAction(fd);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input type="hidden" name="id" value={txn.id} />
                                <button type="submit" className={styles.iconBtn} title="Удалить" aria-label="Удалить">
                                  <span className="material-icons" aria-hidden>
                                    delete
                                  </span>
                                </button>
                              </form>

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
        delAction={(fd) => deleteAction(fd)}
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
        delAction={(fd) => deleteAction(fd)}
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
        delAction={(fd) => deleteAction(fd)}
      />

      {toast && (
        <div className={styles.toastWrap} onAnimationEnd={() => setToast(null)}>
          <div className={styles.toast}>{toast}</div>
        </div>
      )}

      {selected && !editMode && (
        <div className={styles.modalOverlay} onClick={closeView}>
          <div
            className={`${styles.modal} ${viewClosing ? styles.closing : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="txnModalTitle"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalBody}>
              <div className={styles.amountHero}>
                <span className={`${styles.badgeAmount} ${selected.direction === "income" ? styles.badgeIncome : selected.direction === "transfer" ? styles.badgeTransfer : styles.badgeExpense}`}>
                  <span className="material-icons" aria-hidden style={{ fontSize: 18 }}>
                    {selected.direction === "income" ? "arrow_upward" : selected.direction === "transfer" ? "swap_horiz" : "arrow_downward"}
                  </span>
                  {selected.direction === "income" ? "+" : selected.direction === "transfer" ? "" : "−"}
                  {formatMoney(selected.amount, selected.currency)}
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
                          {selected.category_id ? catMap[selected.category_id]?.name || "—" : "Без категории"}
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
        <div className={styles.modalOverlay} onClick={closeEdit}>
          <div
            className={`${styles.modal} ${editClosing ? styles.closing : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="txnEditTitle"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalBody}>
              <div className={styles.amountHero}>
                <span className={`${styles.badgeAmount} ${selected.direction === "income" ? styles.badgeIncome : selected.direction === "transfer" ? styles.badgeTransfer : styles.badgeExpense}`}>
                  <span className="material-icons" aria-hidden style={{ fontSize: 18 }}>
                    {selected.direction === "income" ? "arrow_upward" : selected.direction === "transfer" ? "swap_horiz" : "arrow_downward"}
                  </span>
                  {selected.direction === "income" ? "+" : selected.direction === "transfer" ? "" : "−"}
                  {formatMoney(selected.amount, selected.currency)}
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
                                label
                              </span>
                            </span>
                            Категория
                          </span>
                          <span className={styles.modalValue}>
                            <select {...register("category_id")} className={styles.select}>
                              <option value="">— не выбрана —</option>
                              {categories
                                .filter((c) => c.kind !== "transfer")
                                .map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
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
                              {...register("amount_major")}
                              className={styles.input}
                              type="text"
                              inputMode="decimal"
                              disabled={selected.direction === "transfer"}
                            />
                            {errors.amount_major && (
                              <div className={styles.fieldError}>{errors.amount_major.message}</div>
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
