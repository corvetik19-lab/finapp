"use client";
import styles from "@/components/transactions/Transactions.module.css";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Amount input mask helpers (module scope for stable references)
function normalizeAmountRaw(s: string): string {
  let x = s.replace(/\s+/g, "");
  x = x.replace(/,/g, ",").replace(/\.(?=.*\.)/g, "");
  x = x.replace(/[^0-9.,]/g, "");
  if (x.includes(".")) x = x.replace(/\./g, ",");
  const parts = x.split(",");
  if (parts.length > 2) x = parts[0] + "," + parts.slice(1).join("").replace(/,/g, "");
  return x;
}
function formatAmountDisplay(s: string): string {
  if (!s) return "";
  const raw = normalizeAmountRaw(s);
  const [intPartRaw, fracRaw = ""] = raw.split(",");
  const intPart = intPartRaw.replace(/^0+(?=\d)/, "");
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const frac = fracRaw.slice(0, 2);
  return frac ? `${withSep},${frac}` : withSep;
}
function displayToParam(s: string): string {
  return s.replace(/\s+/g, "").replace(/,/g, ".");
}

export type FiltersAccount = { id: string; name: string };
export type FiltersCategory = { id: string; name: string; kind: "income" | "expense" | "transfer" };

export default function FiltersAndSearch({
  accounts,
  categories,
  initial,
}: {
  accounts: FiltersAccount[];
  categories: FiltersCategory[];
  initial?: Partial<{
    q: string;
    period: string;
    type: string;
    categories: string; // comma separated ids
    accounts: string;   // comma separated ids
    min: string;
    max: string;
    from: string; // YYYY-MM-DD
    to: string;   // YYYY-MM-DD
  }>;
}) {
  const [presetName, setPresetName] = useState("");
  type PresetPayload = {
    q?: string;
    period?: string;
    type?: string;
    categories?: string[];
    accounts?: string[];
    min?: string;
    max?: string;
    from?: string;
    to?: string;
  };
  type Preset = { id: string; name: string; payload: PresetPayload };
  const [presets, setPresets] = useState<Preset[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [q, setQ] = useState(initial?.q ?? sp.get("q") ?? "");
  const [period, setPeriod] = useState(initial?.period ?? sp.get("period") ?? "current-month");
  const [type, setType] = useState(initial?.type ?? sp.get("type") ?? "all");
  const [min, setMin] = useState(initial?.min ?? sp.get("min") ?? "");
  const [max, setMax] = useState(initial?.max ?? sp.get("max") ?? "");
  const [from, setFrom] = useState(initial?.from ?? sp.get("from") ?? "");
  const [to, setTo] = useState(initial?.to ?? sp.get("to") ?? "");
  const [accountsSel, setAccountsSel] = useState<string[]>(() => {
    const raw = initial?.accounts ?? sp.get("accounts");
    return raw ? raw.split(",").filter(Boolean) : [];
  });
  const [categoriesSel, setCategoriesSel] = useState<string[]>(() => {
    const raw = initial?.categories ?? sp.get("categories");
    return raw ? raw.split(",").filter(Boolean) : [];
  });

  function updateUrl(next: Partial<Record<string, string>>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleMinChange(val: string) {
    const disp = formatAmountDisplay(val);
    setMin(disp);
    const param = displayToParam(disp);
    updateUrl({ min: param });
  }
  function handleMaxChange(val: string) {
    const disp = formatAmountDisplay(val);
    setMax(disp);
    const param = displayToParam(disp);
    updateUrl({ max: param });
  }

  useEffect(() => {
    // Keep local state in sync if user navigates via back/forward
    setQ(sp.get("q") ?? "");
    setPeriod(sp.get("period") ?? "current-month");
    setType(sp.get("type") ?? "all");
    setMin(formatAmountDisplay(sp.get("min") ?? ""));
    setMax(formatAmountDisplay(sp.get("max") ?? ""));
    setFrom(sp.get("from") ?? "");
    setTo(sp.get("to") ?? "");
    setAccountsSel(() => {
      const raw = sp.get("accounts");
      return raw ? raw.split(",").filter(Boolean) : [];
    });
    setCategoriesSel(() => {
      const raw = sp.get("categories");
      return raw ? raw.split(",").filter(Boolean) : [];
    });
  }, [sp]);

  async function loadPresets() {
    try {
      const res = await fetch("/api/filters-presets");
      if (!res.ok) return;
      const json = await res.json();
      setPresets(json.presets || []);
    } catch {}
  }
  useEffect(() => { loadPresets(); }, []);

  async function addPreset() {
    const name = presetName.trim();
    if (!name) return;
    const payload = {
      q,
      period,
      type,
      categories: categoriesSel,
      accounts: accountsSel,
      min,
      max,
      from,
      to,
    };
    const res = await fetch("/api/filters-presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, payload }),
    });
    if (res.ok) {
      setPresetName("");
      loadPresets();
    }
  }
  async function removePreset(name: string) {
    const res = await fetch(`/api/filters-presets?name=${encodeURIComponent(name)}`, { method: "DELETE" });
    if (res.ok) loadPresets();
  }
  function applyPreset(p: Preset) {
    const pl = p.payload || {};
    setQ(pl.q || "");
    setPeriod(pl.period || "current-month");
    setType(pl.type || "all");
    setCategoriesSel(pl.categories || []);
    setAccountsSel(pl.accounts || []);
    setMin(pl.min || "");
    setMax(pl.max || "");
    setFrom(pl.from || "");
    setTo(pl.to || "");
    updateUrl({
      q: pl.q || "",
      period: pl.period || "current-month",
      type: pl.type || "all",
      categories: (pl.categories || []).join(","),
      accounts: (pl.accounts || []).join(","),
      min: pl.min || "",
      max: pl.max || "",
      from: pl.from || "",
      to: pl.to || "",
    });
  }

  const incomeCats = categories.filter((c) => c.kind === "income");
  const expenseCats = categories.filter((c) => c.kind === "expense");

  return (
    <section className={styles.filtersCard}>
      <div className={styles.filtersHeader}>
        <div className={styles.filtersTitle}>Фильтры и поиск в транзакциях</div>
      </div>

      {/* Presets */}
      <div className={styles.filterPresets}>
        <input
          type="text"
          className={styles.input}
          placeholder="Название пресета"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          style={{ width: "auto", minWidth: 200 }}
        />
        <button type="button" className={styles.lightBtn} onClick={addPreset}>
          Сохранить пресет
        </button>
        <div className={styles.presetsList}>
          {presets.map((p) => (
            <span key={p.id} className={styles.presetChip} onClick={() => applyPreset(p)} title="Применить пресет">
              {p.name}
              <span
                className={styles.del}
                onClick={(e) => { e.stopPropagation(); removePreset(p.name); }}
                title="Удалить"
              >
                ×
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Filters grid */}
      <div className={styles.filtersGrid}>
        <div className={styles.filterGroup}>
          <label className={styles.label}>Поиск по названию</label>
          <input
            type="text"
            className={styles.input}
            placeholder="Введите название транзакции..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              updateUrl({ q: e.target.value });
            }}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>Период</label>
          <select
            className={styles.select}
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              updateUrl({ period: e.target.value });
            }}
          >
            <option value="current-month">Этот месяц</option>
            <option value="prev-month">Прошлый месяц</option>
            <option value="current-year">Этот год</option>
            <option value="custom">Произвольный период</option>
          </select>
          {period === "custom" && (
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <input
                type="date"
                className={styles.input}
                value={from}
                onChange={(e) => { setFrom(e.target.value); updateUrl({ from: e.target.value }); }}
                placeholder="От"
              />
              <input
                type="date"
                className={styles.input}
                value={to}
                onChange={(e) => { setTo(e.target.value); updateUrl({ to: e.target.value }); }}
                placeholder="До"
              />
            </div>
          )}
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>Тип транзакции</label>
          <select
            className={styles.select}
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              updateUrl({ type: e.target.value });
            }}
          >
            <option value="all">Все</option>
            <option value="income">Доход</option>
            <option value="expense">Расход</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>Категория</label>
          {incomeCats.length + expenseCats.length === 0 ? (
            <select className={styles.select} disabled>
              <option>Нет категорий</option>
            </select>
          ) : (
            <select
              className={styles.select}
              value={categoriesSel[0] || "all"}
              onChange={(e) => {
                const v = e.currentTarget.value;
                const values = v === "all" ? [] : [v];
                setCategoriesSel(values);
                updateUrl({ categories: values.length ? values.join(",") : "" });
              }}
            >
              <option value="all">Все категории</option>
              {[{ label: "Доход", list: incomeCats }, { label: "Расход", list: expenseCats }].map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.list.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>Счет/Карта</label>
          {accounts.length === 0 ? (
            <select className={styles.select} disabled>
              <option>Нет счетов</option>
            </select>
          ) : (
            <select
              className={styles.select}
              value={accountsSel[0] || "all"}
              onChange={(e) => {
                const v = e.currentTarget.value;
                const values = v === "all" ? [] : [v];
                setAccountsSel(values);
                updateUrl({ accounts: values.length ? values.join(",") : "" });
              }}
            >
              <option value="all">Все счета</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>Сумма</label>
          <div className={styles.amountRow}>
            <div className={styles.amountField}>
              <span className={styles.amountLabel}>От</span>
              <input
                type="text"
                inputMode="decimal"
                className={`${styles.noSpin} ${styles.amountInput}`}
                placeholder="0"
                value={min}
                onChange={(e) => handleMinChange(e.target.value)}
              />
            </div>
            <div className={styles.amountField}>
              <span className={styles.amountLabel}>До</span>
              <input
                type="text"
                inputMode="decimal"
                className={`${styles.noSpin} ${styles.amountInput}`}
                placeholder="0"
                value={max}
                onChange={(e) => handleMaxChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
