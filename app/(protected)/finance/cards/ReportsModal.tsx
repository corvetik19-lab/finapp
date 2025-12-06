"use client";

import { useState } from "react";
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
import { BarChart3 } from "lucide-react";
import Link from "next/link";

export default function ReportsModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BarChart3 className="mr-2 h-4 w-4" />
          Отчёты
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Быстрые отчёты</DialogTitle>
          <DialogDescription>
            Просмотр ключевых метрик и аналитики
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Отчёты в разработке. В финальной версии здесь появятся визуализации и ключевые метрики расходов и доходов.
          </p>
          <p className="text-sm text-muted-foreground">
            Пока вы можете открыть полный раздел отчётов для просмотра детальной аналитики.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Закрыть
          </Button>
          <Button asChild>
            <Link href="/finance/reports">Перейти в отчёты</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
