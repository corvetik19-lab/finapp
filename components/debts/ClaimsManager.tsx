"use client";

import { Debt } from "@/types/debt";
import { ClaimsTable } from "./ClaimsTable";
import { ClaimFormModal } from "./ClaimFormModal";
import { createDebt } from "@/lib/debts/service";
import { DebtFormSchema } from "@/lib/validation/debt";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./ClaimsManager.module.css";

interface ClaimsManagerProps {
  initialDebts: Debt[];
}

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
    <div className={styles.container}>
      {/* Заголовок и кнопка */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>⚖️ Взыскание долгов</h1>
          <p className={styles.subtitle}>Реестр задолженностей и претензионная работа</p>
        </div>
        <button 
          className={styles.addBtn}
          onClick={() => {
            setEditingDebt(null);
            setIsModalOpen(true);
          }}
        >
          <span className="material-icons">add</span>
          ДОБАВИТЬ ПРЕТЕНЗИЮ
        </button>
      </div>

      {/* Таблица */}
      <ClaimsTable initialDebts={initialDebts} />

      {/* Модалка */}
      <ClaimFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreate}
        initialData={editingDebt}
      />
    </div>
  );
}
