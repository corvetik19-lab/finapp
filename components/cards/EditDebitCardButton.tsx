"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCardAction } from "@/app/(protected)/finance/cards/actions";
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
import { Pencil } from "lucide-react";

type EditDebitCardButtonProps = {
  cardId: string;
  cardName: string;
  cardBalance: number;
};

export default function EditDebitCardButton({
  cardId,
  cardName,
  cardBalance,
}: EditDebitCardButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(cardName);
  const [balance, setBalance] = useState((cardBalance / 100).toString());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleOpen = (open: boolean) => {
    if (open) {
      setName(cardName);
      setBalance((cardBalance / 100).toString());
      setError(null);
    }
    setIsOpen(open);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateCardAction(formData);
        setIsOpen(false);
        router.refresh();
      } catch (err) {
        console.error("Update error:", err);
        setError(err instanceof Error ? err.message : "Произошла ошибка");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редактировать карту</DialogTitle>
          <DialogDescription>Измените параметры карты</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="id" value={cardId} />
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor={`edit-card-name-${cardId}`}>Название карты</Label>
              <Input
                id={`edit-card-name-${cardId}`}
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например, Основная карта"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`edit-card-balance-${cardId}`}>Баланс (₽)</Label>
              <Input
                id={`edit-card-balance-${cardId}`}
                name="balance"
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Сохраняем..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
