"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Filter, Save, X, Search } from "lucide-react";

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
export type FiltersCategory = { id: string; name: string; kind: "income" | "expense" | "transfer" | "both" };

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

  const updateUrl = useCallback((next: Partial<Record<string, string>>) => {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, sp]);

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

  const incomeCats = useMemo(() => categories.filter((c) => c.kind === "income"), [categories]);
  const expenseCats = useMemo(() => categories.filter((c) => c.kind === "expense"), [categories]);
  const visibleCats = useMemo(() => {
    if (type === "income") return incomeCats;
    if (type === "expense") return expenseCats;
    return [...incomeCats, ...expenseCats];
  }, [type, incomeCats, expenseCats]);

  useEffect(() => {
    if (categoriesSel.length === 0) return;
    const allowedIds = new Set(visibleCats.map((c) => c.id));
    if (!categoriesSel.every((id) => allowedIds.has(id))) {
      setCategoriesSel([]);
      updateUrl({ categories: "" });
    }
  }, [visibleCats, categoriesSel, updateUrl]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Фильтры и поиск
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Название пресета" value={presetName} onChange={(e) => setPresetName(e.target.value)} className="w-48 h-8" />
          <Button variant="outline" size="sm" onClick={addPreset}>
            <Save className="h-4 w-4 mr-1" />
            Сохранить
          </Button>
          {presets.map((p) => (
            <Button key={p.id} variant="secondary" size="sm" className="gap-1" onClick={() => applyPreset(p)}>
              {p.name}
              <X className="h-3 w-3 ml-1 hover:text-destructive" onClick={(e) => { e.stopPropagation(); removePreset(p.name); }} />
            </Button>
          ))}
        </div>

        {/* Filters grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="space-y-2">
            <Label>Поиск</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Название транзакции..." value={q} onChange={(e) => { setQ(e.target.value); updateUrl({ q: e.target.value }); }} className="pl-8 h-9" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Период</Label>
            <Select value={period} onValueChange={(v) => { setPeriod(v); updateUrl({ period: v }); }}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="current-month">Этот месяц</SelectItem>
                <SelectItem value="prev-month">Прошлый месяц</SelectItem>
                <SelectItem value="current-year">Этот год</SelectItem>
                <SelectItem value="custom">Произвольный</SelectItem>
              </SelectContent>
            </Select>
            {period === "custom" && (
              <div className="flex gap-2 mt-2">
                <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); updateUrl({ from: e.target.value }); }} className="h-8" />
                <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); updateUrl({ to: e.target.value }); }} className="h-8" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Тип</Label>
            <Select value={type} onValueChange={(v) => { setType(v); updateUrl({ type: v }); }}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="income">Доход</SelectItem>
                <SelectItem value="expense">Расход</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Категория</Label>
            <Select value={categoriesSel[0] || "all"} onValueChange={(v) => { const values = v === "all" ? [] : [v]; setCategoriesSel(values); updateUrl({ categories: values.length ? values.join(",") : "" }); }} disabled={visibleCats.length === 0}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Все категории" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {type === "all" ? (
                  <>
                    <SelectGroup><SelectLabel>Доход</SelectLabel>{incomeCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectGroup>
                    <SelectGroup><SelectLabel>Расход</SelectLabel>{expenseCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectGroup>
                  </>
                ) : (
                  visibleCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Счет</Label>
            <Select value={accountsSel[0] || "all"} onValueChange={(v) => { const values = v === "all" ? [] : [v]; setAccountsSel(values); updateUrl({ accounts: values.length ? values.join(",") : "" }); }} disabled={accounts.length === 0}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Все счета" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все счета</SelectItem>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Сумма</Label>
            <div className="flex gap-2">
              <Input type="text" inputMode="decimal" placeholder="От" value={min} onChange={(e) => handleMinChange(e.target.value)} className="h-9" />
              <Input type="text" inputMode="decimal" placeholder="До" value={max} onChange={(e) => handleMaxChange(e.target.value)} className="h-9" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
