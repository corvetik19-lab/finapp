"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CsvImportModal } from "./CsvImportModal";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast/ToastContext";

type Category = {
  id: string;
  name: string;
  kind: string;
};

type Product = {
  id: string;
  name: string;
  category_id: string | null;
  category_type: "income" | "expense" | null;
  default_unit: string;
  default_price_per_unit: number | null;
};

export default function BankImportTrigger() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  async function loadData() {
    const supabase = getSupabaseClient();
    
    // Загружаем категории
    const { data: cats } = await supabase
      .from("categories")
      .select("id, name, kind")
      .order("name");
    setCategories(cats || []);
    
    // Загружаем товары
    const { data: prods } = await supabase
      .from("product_items")
      .select("id, name, category_id, category_type, default_unit, default_price_per_unit")
      .order("name");
    setProducts(prods || []);
  }

  const handleImport = async (transactions: Array<{
    date: string;
    amount: number;
    description: string;
    category_id: string | null;
    direction: "income" | "expense";
    product?: {
      id: string;
      name: string;
      quantity: number;
      unit: string;
      price_per_unit: number;
    };
  }>) => {
    const supabase = getSupabaseClient();
    
    // Получаем первый счёт пользователя как дефолтный (с company_id)
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id, company_id")
      .is("deleted_at", null)
      .limit(1);
    
    const defaultAccount = accounts?.[0];
    
    if (!defaultAccount?.id) {
      throw new Error("Создайте хотя бы один счёт перед импортом");
    }

    const defaultAccountId = defaultAccount.id;
    const companyId = defaultAccount.company_id || null;

    // Получаем текущего пользователя
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Необходимо авторизоваться");
    }

    // Создаём транзакции по одной чтобы можно было добавить товары
    for (const t of transactions) {
      const { data: inserted, error } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          occurred_at: new Date(t.date).toISOString(),
          amount: t.amount, // уже в копейках
          currency: "RUB",
          direction: t.direction,
          counterparty: t.description,
          note: `Импорт из банковской выписки`,
          category_id: t.category_id || null,
          account_id: defaultAccountId,
          company_id: companyId,
          tags: ["банк", "импорт"],
        })
        .select("id")
        .single();
      
      if (error) {
        console.error("Import error:", error);
        throw new Error("Ошибка при импорте: " + error.message);
      }

      // Если есть товар - создаём позицию
      if (t.product && inserted) {
        await supabase.from("transaction_items").insert({
          transaction_id: inserted.id,
          user_id: user.id,
          product_id: t.product.id,
          name: t.product.name,
          quantity: t.product.quantity,
          unit: t.product.unit,
          price_per_unit: t.product.price_per_unit,
          category_id: t.category_id,
          company_id: companyId,
        });
      }
    }

    toast.show(`Импортировано ${transactions.length} транзакций`, { type: "success" });
    router.refresh();
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Building2 className="h-4 w-4 mr-1" />
        Из банка
      </Button>
      <CsvImportModal
        open={open}
        onOpenChange={setOpen}
        categories={categories}
        products={products}
        onImport={handleImport}
      />
    </>
  );
}
