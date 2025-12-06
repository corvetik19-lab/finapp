"use client";

import { useState, useMemo, useId, useCallback, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { transferStashAction } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";

type Mode = "to_stash" | "from_stash";

type StashOption = {
  accountId: string;
  accountName: string;
  cardBalance: number;
  cardCurrency: string;
  stashId: string;
  stashBalance: number;
  stashCurrency: string;
};

type TransferModalLauncherProps = {
  mode: Mode;
  icon: string;
  label: string;
  options: StashOption[];
};

function formatMoney(value: number, currency: string) {
  const major = value / 100;
  if (currency === "RUB") {
    return `${major.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
  }
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency, maximumFractionDigits: 2 }).format(major);
}

function SubmitButton({ mode }: { mode: Mode }) {
  const { pending } = useFormStatus();
  const text = mode === "to_stash" ? "Перевести в Кубышку" : "Перевести из Кубышки";
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Выполняем..." : text}
    </Button>
  );
}

export default function TransferModalLauncher({ mode, label, options }: TransferModalLauncherProps) {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState(0);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  const hasOptions = options.length > 0;
  const current = options[selection] ?? options[0] ?? null;

  const dialogTitle = mode === "to_stash" ? "Перевод в Кубышку" : "Перевод из Кубышки";
  const balanceHint = useMemo(() => {
    if (!current) return null;
    return {
      card: formatMoney(current.cardBalance, current.cardCurrency),
      stash: formatMoney(current.stashBalance, current.stashCurrency),
    };
  }, [current]);

  const resetFormState = useCallback(() => {
    setAmount("");
    setError(null);
  }, []);

  useEffect(() => {
    if (open) {
      setSelection(0);
      resetFormState();
    }
  }, [open, resetFormState]);

  const Icon = mode === "to_stash" ? ArrowUpCircle : ArrowDownCircle;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!hasOptions}>
          <Icon className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      {current && (
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {mode === "to_stash" ? "Переведите средства с карты в Кубышку" : "Переведите средства из Кубышки на карту"}
            </DialogDescription>
          </DialogHeader>
          <form
            action={async (formData) => {
              const rawAmount = formData.get("amount_major");
              const normalized = typeof rawAmount === "string" ? rawAmount.trim().replace(/\s+/g, "").replace(",", ".") : "";
              const parsed = Number(normalized);
              if (!normalized || Number.isNaN(parsed) || parsed <= 0) {
                setError("Введите сумму больше 0");
                return;
              }
              if (current) {
                const minor = Math.round(parsed * 100);
                if (mode === "to_stash" && minor > current.cardBalance) {
                  setError("Недостаточно средств на карте");
                  return;
                }
                if (mode === "from_stash" && minor > current.stashBalance) {
                  setError("Недостаточно средств в Кубышке");
                  return;
                }
              }
              setError(null);
              formData.set("amount_major", normalized);
              await transferStashAction(formData);
              setOpen(false);
            }}
          >
            <div className="grid gap-4 py-4">
              {options.length > 1 && (
                <div className="grid gap-2">
                  <Label htmlFor={`${titleId}-account`}>Карта</Label>
                  <Select value={current.accountId} onValueChange={(val) => {
                    const idx = options.findIndex((o) => o.accountId === val);
                    setSelection(idx >= 0 ? idx : 0);
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {options.map((opt) => (
                        <SelectItem key={opt.accountId} value={opt.accountId}>{opt.accountName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <input type="hidden" name="direction" value={mode} />
              <input type="hidden" name="account_id" value={current.accountId} />
              <input type="hidden" name="stash_id" value={current.stashId} />
              <input type="hidden" name="currency" value={current.stashCurrency} />
              <div className="grid gap-2">
                <Label htmlFor={`${titleId}-amount`}>Сумма (₽)</Label>
                <Input
                  id={`${titleId}-amount`}
                  name="amount_major"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  required
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); if (error) setError(null); }}
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>
              {balanceHint && (
                <div className="grid grid-cols-2 gap-4 bg-muted rounded-lg p-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Баланс карты</p>
                    <p className="font-bold">{balanceHint.card}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Баланс Кубышки</p>
                    <p className="font-bold">{balanceHint.stash}</p>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {mode === "to_stash" ? "Средства спишутся с карты и будут зачислены в Кубышку" : "Средства поступят на карту и уменьшат баланс Кубышки"}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
              <SubmitButton mode={mode} />
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}
