"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { addFundsAction } from "./actions";
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
import { PlusCircle } from "lucide-react";

type FundsOption = {
  accountId: string;
  accountName: string;
  cardBalance: number;
  cardCurrency: string;
};

type AddFundsModalProps = {
  icon: string;
  label: string;
  options: FundsOption[];
};

function formatCurrency(value: number, currency: string) {
  const major = value / 100;
  if (currency === "RUB") {
    return `${major.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
  }
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency, minimumFractionDigits: 2 }).format(major);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Сохраняем..." : "Пополнить карту"}
    </Button>
  );
}

export default function AddFundsModal({ label, options }: AddFundsModalProps) {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState(0);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  const hasOptions = options.length > 0;
  const current = options[selection] ?? options[0] ?? null;

  const balances = useMemo(() => {
    if (!current) return null;
    return formatCurrency(current.cardBalance, current.cardCurrency);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!hasOptions}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      {current && (
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Пополнение карты</DialogTitle>
            <DialogDescription>Добавьте средства на выбранную карту</DialogDescription>
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
              setError(null);
              formData.set("amount_major", normalized);
              await addFundsAction(formData);
              setOpen(false);
            }}
          >
            <div className="grid gap-4 py-4">
              {options.length > 1 && (
                <div className="grid gap-2">
                  <Label htmlFor={`${titleId}-card`}>Карта</Label>
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
              <input type="hidden" name="account_id" value={current.accountId} />
              <input type="hidden" name="currency" value={current.cardCurrency} />
              <div className="grid gap-2">
                <Label htmlFor={`${titleId}-amount`}>Сумма пополнения (₽)</Label>
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
              <div className="grid gap-2">
                <Label htmlFor={`${titleId}-note`}>Комментарий (опционально)</Label>
                <Input id={`${titleId}-note`} name="note" placeholder="Например, перевод зарплаты" maxLength={200} />
              </div>
              {balances && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Текущий баланс карты</p>
                  <p className="text-lg font-bold">{balances}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Пополнение будет сохранено как доход и отобразится в истории транзакций.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
              <SubmitButton />
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}
