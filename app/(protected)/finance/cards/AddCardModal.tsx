"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { addCardAction } from "./actions";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Добавляем..." : "Добавить карту"}
    </Button>
  );
}

export default function AddCardModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Добавить карту
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Добавить новую карту</DialogTitle>
          <DialogDescription>
            Введите данные для новой дебетовой карты
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await addCardAction(formData);
            setOpen(false);
          }}
        >
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="card-name">Название карты</Label>
              <Input id="card-name" name="name" placeholder="Например, Основная карта" required />
            </div>

            <input type="hidden" name="card_type" value="debit" />
            <input type="hidden" name="card_color" value="blue" />
            <input type="hidden" name="currency" value="RUB" />

            <div className="grid gap-2">
              <Label htmlFor="card-balance">Начальный баланс (₽)</Label>
              <Input
                id="card-balance"
                name="initial_balance"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox id="create_stash" name="create_stash" defaultChecked />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="create_stash" className="font-medium">Создать Кубышку</Label>
                <p className="text-sm text-muted-foreground">
                  Виртуальный счёт для накоплений с целевым балансом 50 000 ₽
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
