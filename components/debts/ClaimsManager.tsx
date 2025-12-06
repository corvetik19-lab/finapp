"use client";

import { Debt } from "@/types/debt";
import { ClaimsTable } from "./ClaimsTable";
import { ClaimFormModal } from "./ClaimFormModal";
import { createDebt } from "@/lib/debts/service";
import { DebtFormSchema } from "@/lib/validation/debt";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Scale, Plus } from "lucide-react";

interface ClaimsManagerProps { initialDebts: Debt[]; }

export function ClaimsManager({ initialDebts }: ClaimsManagerProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  const handleCreate = async (data: DebtFormSchema) => {
    try {
      await createDebt(data);
      setIsModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Ошибка при создании претензии');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Scale className="h-6 w-6" />Взыскание долгов</h1><p className="text-muted-foreground">Реестр задолженностей и претензионная работа</p></div>
        <Button onClick={() => { setEditingDebt(null); setIsModalOpen(true); }}><Plus className="h-4 w-4 mr-2" />Добавить претензию</Button>
      </div>
      <ClaimsTable initialDebts={initialDebts} />
      <ClaimFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreate} initialData={editingDebt} />
    </div>
  );
}
