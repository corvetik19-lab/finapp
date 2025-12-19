"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { IMAGE_MODELS, VIDEO_MODELS, AUDIO_MODELS, KieModel } from "@/lib/kie";

type Category = "all" | "image" | "video" | "audio";

export default function KieStudioPage() {
  const [category, setCategory] = useState<Category>("all");
  const [search, setSearch] = useState("");
  const [credits, setCredits] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(true);

  // Загрузка баланса
  useEffect(() => {
    const loadCredits = async () => {
      try {
        const response = await fetch("/api/kie/credits");
        const data = await response.json();
        if (response.ok) {
          setCredits(data.credits);
        }
      } catch (err) {
        console.error("Failed to load credits:", err);
      } finally {
        setCreditsLoading(false);
      }
    };
    loadCredits();
  }, []);

  const allModels = [...IMAGE_MODELS, ...VIDEO_MODELS, ...AUDIO_MODELS];

  const filteredModels = allModels.filter((model) => {
    const matchesCategory = category === "all" || model.category === category;
    const matchesSearch = search === "" || 
      model.nameRu.toLowerCase().includes(search.toLowerCase()) ||
      model.descriptionRu.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryPath = (model: KieModel) => {
    switch (model.category) {
      case "image": return `/ai-studio/kie/images/${model.id}`;
      case "video": return `/ai-studio/kie/video/${model.id}`;
      case "audio": return `/ai-studio/kie/audio/${model.id}`;
      default: return `/ai-studio/kie`;
    }
  };

  const getTypeLabel = (model: KieModel) => {
    switch (model.type) {
      case "text-to-image": return "Текст → Изображение";
      case "image-edit": return "Редактирование";
      case "upscale": return "Увеличение";
      case "background-removal": return "Удаление фона";
      case "character": return "Персонаж";
      case "reframe": return "Рефрейм";
      case "text-to-video": return "Текст → Видео";
      case "image-to-video": return "Фото → Видео";
      case "text-to-speech": return "Текст → Речь";
      default: return model.type;
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>🎨 Kie.ai Studio</h1>
          <p className={styles.subtitle}>
            Генерация изображений, видео и аудио с помощью ИИ
          </p>
        </div>
        <div className={styles.creditsBox}>
          <span className={styles.creditsLabel}>💰 Баланс:</span>
          {creditsLoading ? (
            <span className={styles.creditsValue}>...</span>
          ) : credits !== null ? (
            <span className={styles.creditsValue}>{credits.toLocaleString("ru-RU")} кредитов</span>
          ) : (
            <span className={styles.creditsError}>Ошибка</span>
          )}
          <a
            href="https://kie.ai/api-key"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.topUpLink}
          >
            Пополнить →
          </a>
        </div>
      </header>

      <div className={styles.controls}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${category === "all" ? styles.active : ""}`}
            onClick={() => setCategory("all")}
          >
            Все ({allModels.length})
          </button>
          <button
            className={`${styles.tab} ${category === "image" ? styles.active : ""}`}
            onClick={() => setCategory("image")}
          >
            🖼️ Изображения ({IMAGE_MODELS.length})
          </button>
          <button
            className={`${styles.tab} ${category === "video" ? styles.active : ""}`}
            onClick={() => setCategory("video")}
          >
            🎬 Видео ({VIDEO_MODELS.length})
          </button>
          <button
            className={`${styles.tab} ${category === "audio" ? styles.active : ""}`}
            onClick={() => setCategory("audio")}
          >
            🎵 Аудио ({AUDIO_MODELS.length})
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
            href={getCategoryPath(model)}
            className={styles.card}
          >
            <div className={styles.cardIcon}>{model.icon}</div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>{model.nameRu}</h3>
              <p className={styles.cardDescription}>{model.descriptionRu}</p>
              <div className={styles.cardMeta}>
                <span className={`${styles.badge} ${styles[model.category]}`}>
                  {getTypeLabel(model)}
                </span>
              </div>
            </div>
            <div className={styles.cardArrow}>
              →
            </div>
          </Link>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <div className={styles.empty}>
          🔍
          <p>Модели не найдены</p>
          <button onClick={() => { setSearch(""); setCategory("all"); }}>
            Сбросить фильтры
          </button>
        </div>
      )}
    </div>
  );
}
