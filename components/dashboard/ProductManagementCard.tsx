"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import styles from "@/components/dashboard/Dashboard.module.css";
import { formatMoney } from "@/lib/utils/format";

export type ProductSummaryPeriod = "week" | "month" | "year" | "custom";

export type ProductSummaryItem = {
  name: string;
  quantity: number;
  unit: string;
  totalAmount: number;
  transactionCount: number;
};

const PERIODS: { id: ProductSummaryPeriod; label: string }[] = [
  { id: "week", label: "Неделя" },
  { id: "month", label: "Месяц" },
  { id: "year", label: "Год" },
  { id: "custom", label: "Произвольно" },
];

const INITIAL_VISIBLE_COUNT = 6;

export type ProductManagementCardProps = {
  allProducts: ProductSummaryItem[];
  visibleProducts: string[];
  currency: string;
  from: string;
  to: string;
};

export default function ProductManagementCard({
  allProducts,
  visibleProducts: initialVisibleProducts,
  currency,
  from: initialFrom,
  to: initialTo,
}: ProductManagementCardProps) {
  const [isPending, startTransition] = useTransition();

  const [products, setProducts] = useState(allProducts);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [period, setPeriod] = useState<ProductSummaryPeriod>("month");
  const [customRange, setCustomRange] = useState<{ from: string; to: string }>({
    from: initialFrom.slice(0, 10),
    to: initialTo.slice(0, 10),
  });

  const [visibleIds, setVisibleIds] = useState<string[]>(() =>
    initialVisibleProducts.length > 0
      ? initialVisibleProducts
      : allProducts.slice(0, INITIAL_VISIBLE_COUNT).map((item) => item.name)
  );

  const [selectedHiddenId, setSelectedHiddenId] = useState<string | null>(() => {
    const defaults = allProducts.slice(INITIAL_VISIBLE_COUNT);
    return defaults[0]?.name ?? null;
  });

  // Загрузка данных при изменении периода
  useEffect(() => {
    if (period === "custom") return;

    const fetchData = async () => {
      startTransition(async () => {
        try {
          const response = await fetch(
            `/api/dashboard/products?period=${period}`
          );
          if (!response.ok) throw new Error("Failed to fetch products");
          const data = await response.json();
          setProducts(data.products);
          setError(null);
        } catch (err) {
          setError("Не удалось загрузить данные");
          console.error(err);
        }
      });
    };

    fetchData();
  }, [period]);

  // Применение произвольного периода
  const handleApplyCustomRange = () => {
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/dashboard/products?from=${customRange.from}&to=${customRange.to}`
        );
        if (!response.ok) throw new Error("Failed to fetch products");
        const data = await response.json();
        setProducts(data.products);
        setError(null);
      } catch (err) {
        setError("Не удалось загрузить данные");
        console.error(err);
      }
    });
  };

  // Сохранение настроек видимости
  const savePreferences = async (newVisibleIds: string[]) => {
    setSaving(true);
    try {
      await fetch("/api/dashboard/product-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibleProducts: newVisibleIds }),
      });
    } catch (err) {
      console.error("Failed to save preferences:", err);
    } finally {
      setSaving(false);
    }
  };

  // Переключение видимости товара
  const handleToggleVisibility = (productName: string) => {
    const newVisible = visibleIds.includes(productName)
      ? visibleIds.filter((id) => id !== productName)
      : [...visibleIds, productName];

    setVisibleIds(newVisible);
    savePreferences(newVisible);
  };

  // Добавление скрытого товара
  const handleAddHidden = () => {
    if (!selectedHiddenId) return;
    const newVisible = [...visibleIds, selectedHiddenId];
    setVisibleIds(newVisible);
    savePreferences(newVisible);

    const remaining = products.filter((p) => !newVisible.includes(p.name));
    setSelectedHiddenId(remaining[0]?.name ?? null);
  };

  const visibleProducts = useMemo(
    () => products.filter((p) => visibleIds.includes(p.name)),
    [products, visibleIds]
  );

  const hiddenProducts = useMemo(
    () => products.filter((p) => !visibleIds.includes(p.name)),
    [products, visibleIds]
  );

  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetHeader}>
        <div className={styles.widgetTitleRow}>
          <span className="material-icons" style={{ fontSize: "24px", color: "#3b82f6" }}>
            inventory_2
          </span>
          <h3 className={styles.widgetTitle}>Управление товарами</h3>
        </div>
        <div className={styles.widgetControls}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as ProductSummaryPeriod)}
            className={styles.periodSelect}
            disabled={isPending}
          >
            {PERIODS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {period === "custom" && (
        <div className={styles.customRangePanel}>
          <div className={styles.customRangeInputs}>
            <input
              type="date"
              value={customRange.from}
              onChange={(e) =>
                setCustomRange((prev) => ({ ...prev, from: e.target.value }))
              }
              className={styles.dateInput}
            />
            <span>—</span>
            <input
              type="date"
              value={customRange.to}
              onChange={(e) =>
                setCustomRange((prev) => ({ ...prev, to: e.target.value }))
              }
              className={styles.dateInput}
            />
          </div>
          <button
            onClick={handleApplyCustomRange}
            disabled={isPending}
            className={styles.applyButton}
          >
            Применить
          </button>
        </div>
      )}

      {error && <div className={styles.errorMessage}>{error}</div>}

      {products.length === 0 ? (
        <div className={styles.emptyState}>
          <span className="material-icons" style={{ fontSize: "48px", color: "#cbd5e1" }}>
            inventory_2
          </span>
          <p>Нет данных по товарам</p>
          <span className={styles.emptyHint}>
            Добавьте позиции товаров в транзакции, чтобы увидеть статистику
          </span>
        </div>
      ) : (
        <>
          <div className={styles.categoryList}>
            {visibleProducts.map((product) => (
              <div key={product.name} className={styles.categoryCard}>
                <div className={styles.categoryCardHeader}>
                  <div className={styles.categoryCardIcon}>
                    <span className="material-icons">shopping_basket</span>
                  </div>
                  <div className={styles.categoryCardInfo}>
                    <div className={styles.categoryCardName}>{product.name}</div>
                    <div className={styles.categoryCardMeta}>
                      {product.quantity} {product.unit} • {product.transactionCount} покупок
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleVisibility(product.name)}
                    className={styles.visibilityButton}
                    title="Скрыть товар"
                  >
                    <span className="material-icons">visibility</span>
                  </button>
                </div>
                <div className={styles.categoryCardAmount}>
                  {formatMoney(Math.round(product.totalAmount * 100), currency)}
                </div>
              </div>
            ))}
          </div>

          {hiddenProducts.length > 0 && (
            <div className={styles.hiddenSection}>
              <div className={styles.hiddenSectionHeader}>
                <span className={styles.hiddenSectionTitle}>
                  Скрытые товары ({hiddenProducts.length})
                </span>
              </div>
              <div className={styles.hiddenSectionContent}>
                <select
                  value={selectedHiddenId || ""}
                  onChange={(e) => setSelectedHiddenId(e.target.value)}
                  className={styles.hiddenSelect}
                >
                  {hiddenProducts.map((product) => (
                    <option key={product.name} value={product.name}>
                      {product.name} — {formatMoney(Math.round(product.totalAmount * 100), currency)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddHidden}
                  disabled={!selectedHiddenId || saving}
                  className={styles.addButton}
                >
                  <span className="material-icons">visibility</span>
                  Показать
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
