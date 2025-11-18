import { Suspense } from "react";
import { ProductItemsManager } from "@/components/product-items/ProductItemsManager";

export const metadata = {
  title: "Управление товарами — FinApp",
  description: "Справочник товаров и позиций для транзакций",
};

export default function ProductsSettingsPage() {
  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>Справочник товаров</h1>
      <p style={{ color: "#666", marginBottom: "20px" }}>
        Добавьте товары и позиции, которые вы часто покупаете. При создании транзакции вы сможете быстро выбрать их из списка.
      </p>
      <Suspense fallback={<div>Загрузка...</div>}>
        <ProductItemsManager />
      </Suspense>
    </div>
  );
}
