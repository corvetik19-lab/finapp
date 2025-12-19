"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { AUDIO_MODELS } from "@/lib/kie/models";
import styles from "../page.module.css";

export default function KieAudioPage() {
  const [search, setSearch] = useState("");

  const filteredModels = useMemo(() => {
    return AUDIO_MODELS.filter((model) => {
      return (
        model.nameRu.toLowerCase().includes(search.toLowerCase()) ||
        model.name.toLowerCase().includes(search.toLowerCase()) ||
        model.descriptionRu.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [search]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "text-to-speech": return "Текст → Речь";
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
          <h1 className={styles.title}>🎵 Генерация аудио</h1>
          <p className={styles.subtitle}>
            {AUDIO_MODELS.length} моделей для синтеза речи и аудио
          </p>
        </div>
      </header>

      <div className={styles.controls}>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${styles.active}`}>
            Все ({AUDIO_MODELS.length})
          </button>
          <button className={styles.tab}>
            🎤 Текст → Речь
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
            href={`/ai-studio/kie/audio/${model.id}`}
            className={styles.card}
          >
            <span className={styles.cardIcon}>{model.icon}</span>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>{model.nameRu}</h3>
              <p className={styles.cardDescription}>{model.descriptionRu}</p>
              <div className={styles.cardMeta}>
                <span className={`${styles.badge} ${styles.audio}`}>
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
          <button onClick={() => setSearch("")}>
            Сбросить фильтры
          </button>
        </div>
      )}
    </div>
  );
}
