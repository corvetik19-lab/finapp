"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { VIDEO_MODELS } from "@/lib/kie/models";
import styles from "../page.module.css";

type VideoType = "all" | "text-to-video" | "image-to-video";

export default function KieVideoPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<VideoType>("all");

  const filteredModels = useMemo(() => {
    return VIDEO_MODELS.filter((model) => {
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
      case "text-to-video": return "Текст → Видео";
      case "image-to-video": return "Фото → Видео";
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
          <h1 className={styles.title}>🎬 Генерация видео</h1>
          <p className={styles.subtitle}>
            {VIDEO_MODELS.length} моделей для создания видео из текста и изображений
          </p>
        </div>
      </header>

      <div className={styles.controls}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${typeFilter === "all" ? styles.active : ""}`}
            onClick={() => setTypeFilter("all")}
          >
            Все ({VIDEO_MODELS.length})
          </button>
          <button
            className={`${styles.tab} ${typeFilter === "text-to-video" ? styles.active : ""}`}
            onClick={() => setTypeFilter("text-to-video")}
          >
            📝 Текст → Видео
          </button>
          <button
            className={`${styles.tab} ${typeFilter === "image-to-video" ? styles.active : ""}`}
            onClick={() => setTypeFilter("image-to-video")}
          >
            🖼️ Фото → Видео
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
            href={`/ai-studio/kie/video/${model.id}`}
            className={styles.card}
          >
            <span className={styles.cardIcon}>{model.icon}</span>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>{model.nameRu}</h3>
              <p className={styles.cardDescription}>{model.descriptionRu}</p>
              <div className={styles.cardMeta}>
                <span className={`${styles.badge} ${styles.video}`}>
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
