"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { IMAGE_MODELS } from "@/lib/kie/models";
import styles from "../page.module.css";

type ImageType = "all" | "text-to-image" | "image-edit" | "upscale" | "background-removal" | "character" | "reframe";

export default function KieImagesPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ImageType>("all");

  const filteredModels = useMemo(() => {
    return IMAGE_MODELS.filter((model) => {
      const matchesSearch =
        model.nameRu.toLowerCase().includes(search.toLowerCase()) ||
        model.name.toLowerCase().includes(search.toLowerCase()) ||
        model.descriptionRu.toLowerCase().includes(search.toLowerCase());

      const matchesType = typeFilter === "all" || model.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [search, typeFilter]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "text-to-image": return "Генерация";
      case "image-edit": return "Редактирование";
      case "upscale": return "Апскейл";
      case "background-removal": return "Удаление фона";
      case "character": return "Персонаж";
      case "reframe": return "Рефрейм";
      default: return type;
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/ai-studio/kie" className={styles.backLink}>
          ← Назад к Kie.ai
        </Link>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>🖼️ Генерация изображений</h1>
          <p className={styles.subtitle}>
            {IMAGE_MODELS.length} моделей для создания и редактирования изображений
          </p>
        </div>
      </header>

      <div className={styles.controls}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${typeFilter === "all" ? styles.active : ""}`}
            onClick={() => setTypeFilter("all")}
          >
            Все ({IMAGE_MODELS.length})
          </button>
          <button
            className={`${styles.tab} ${typeFilter === "text-to-image" ? styles.active : ""}`}
            onClick={() => setTypeFilter("text-to-image")}
          >
            🎨 Генерация
          </button>
          <button
            className={`${styles.tab} ${typeFilter === "image-edit" ? styles.active : ""}`}
            onClick={() => setTypeFilter("image-edit")}
          >
            ✏️ Редактирование
          </button>
          <button
            className={`${styles.tab} ${typeFilter === "upscale" ? styles.active : ""}`}
            onClick={() => setTypeFilter("upscale")}
          >
            🔍 Апскейл
          </button>
          <button
            className={`${styles.tab} ${typeFilter === "background-removal" ? styles.active : ""}`}
            onClick={() => setTypeFilter("background-removal")}
          >
            🧹 Удаление фона
          </button>
        </div>

        <div className={styles.searchContainer}>
          🔍
          <input
            type="text"
            placeholder="Поиск моделей..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className={styles.clearButton}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        {filteredModels.map((model) => (
          <Link
            key={model.id}
            href={`/ai-studio/kie/images/${model.id}`}
            className={styles.card}
          >
            <span className={styles.cardIcon}>{model.icon}</span>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>{model.nameRu}</h3>
              <p className={styles.cardDescription}>{model.descriptionRu}</p>
              <div className={styles.cardMeta}>
                <span className={`${styles.badge} ${styles.image}`}>
                  {getTypeLabel(model.type)}
                </span>
              </div>
            </div>
            <div className={styles.cardArrow}>→</div>
          </Link>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <div className={styles.empty}>
          🔍
          <p>Модели не найдены</p>
          <button onClick={() => { setSearch(""); setTypeFilter("all"); }}>
            Сбросить фильтры
          </button>
        </div>
      )}
    </div>
  );
}
