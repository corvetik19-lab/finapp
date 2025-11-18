"use client";

import { useState } from "react";
import CategoriesManager from "./CategoriesManager";
import FinanceGeneralSettings from "./FinanceGeneralSettings";
import { ProductItemsManager } from "@/components/product-items/ProductItemsManager";
import { QuickPresetsManager } from "@/components/quick-presets/QuickPresetsManager";
import type { CategoryRecord } from "./CategoriesManager";
import type { FinanceSettings } from "@/types/settings";
import styles from "./FinanceSettingsShell.module.css";

interface Props {
  categories: CategoryRecord[];
  settings: FinanceSettings;
}

export default function FinanceSettingsShell({
  categories,
  settings,
}: Props) {
  const [activeTab, setActiveTab] = useState<"general" | "categories" | "products" | "quick">("general");

  const handleSaveSettings = async (newSettings: FinanceSettings) => {
    const response = await fetch("/api/settings/modes/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings),
    });

    if (!response.ok) {
      throw new Error("Failed to save settings");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Настройки режима &quot;Финансы&quot;</h1>
        <p>Управление категориями, планами и параметрами финансового учёта</p>
      </div>

      {/* Табы */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "general" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("general")}
        >
          <span className="material-icons">tune</span>
          Основные
        </button>
        <button
          className={`${styles.tab} ${activeTab === "categories" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("categories")}
        >
          <span className="material-icons">category</span>
          Категории
        </button>
        <button
          className={`${styles.tab} ${activeTab === "products" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("products")}
        >
          <span className="material-icons">shopping_cart</span>
          Товары
        </button>
        <button
          className={`${styles.tab} ${activeTab === "quick" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("quick")}
        >
          <span className="material-icons">bolt</span>
          Быстрые
        </button>
      </div>

      {/* Контент */}
      <div className={styles.content}>
        {activeTab === "general" && (
          <FinanceGeneralSettings
            categories={categories}
            settings={settings}
            onSave={handleSaveSettings}
          />
        )}

        {activeTab === "categories" && (
          <div className={styles.managerWrapper}>
            <CategoriesManager categories={categories} />
          </div>
        )}

        {activeTab === "products" && (
          <div className={styles.managerWrapper}>
            <ProductItemsManager />
          </div>
        )}

        {activeTab === "quick" && (
          <div className={styles.managerWrapper}>
            <QuickPresetsManager />
          </div>
        )}
      </div>
    </div>
  );
}
