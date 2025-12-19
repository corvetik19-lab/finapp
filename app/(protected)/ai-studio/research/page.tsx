"use client";

import { useState } from "react";
import styles from "./page.module.css";

interface ResearchResult {
  topic: string;
  summary: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
  sources: Array<{
    title: string;
    url: string;
  }>;
}

export default function AIResearchPage() {
  const [topic, setTopic] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ResearchResult | null>(null);

  const handleResearch = async () => {
    if (!topic.trim() || isResearching) return;

    setIsResearching(true);
    setProgress(0);
    setResult(null);

    // Симуляция прогресса
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 5, 90));
    }, 500);

    try {
      const res = await fetch("/api/ai-studio/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      clearInterval(interval);

      if (!res.ok) throw new Error("Ошибка исследования");

      const data = await res.json();
      setProgress(100);
      setResult(data);
    } catch (error) {
      console.error("Research error:", error);
      clearInterval(interval);
    } finally {
      setIsResearching(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>
          <span className="material-icons">science</span>
          Глубокое исследование
        </h1>
        <p>Автоматический анализ темы с поиском источников</p>
      </div>

      <div className={styles.content}>
        <div className={styles.mainColumn}>
          {result ? (
            <div className={styles.resultSection}>
              <div className={styles.resultHeader}>
                <h2>{result.topic}</h2>
              </div>

              <div className={styles.summary}>
                <h3>
                  <span className="material-icons">summarize</span>
                  Краткое содержание
                </h3>
                <p>{result.summary}</p>
              </div>

              {result.sections.map((section, i) => (
                <div key={i} className={styles.section}>
                  <h3>{section.title}</h3>
                  <p>{section.content}</p>
                </div>
              ))}

              {result.sources.length > 0 && (
                <div className={styles.sources}>
                  <h3>
                    <span className="material-icons">link</span>
                    Источники
                  </h3>
                  <div className={styles.sourcesList}>
                    {result.sources.map((source, i) => (
                      <a
                        key={i}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.sourceLink}
                      >
                        <span className="material-icons">open_in_new</span>
                        {source.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.placeholder}>
              <span className="material-icons">science</span>
              <p>Результаты исследования появятся здесь</p>
            </div>
          )}
        </div>

        <div className={styles.sidebarColumn}>
          <div className={styles.inputSection}>
            <label>Тема исследования</label>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Введите тему для исследования..."
                onKeyDown={(e) => e.key === "Enter" && handleResearch()}
              />
              <button
                onClick={handleResearch}
                disabled={!topic.trim() || isResearching}
                className={styles.researchButton}
              >
                <span className="material-icons">
                  {isResearching ? "hourglass_empty" : "explore"}
                </span>
                {isResearching ? "..." : "Поиск"}
              </button>
            </div>

            {isResearching && (
              <div className={styles.progressSection}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p>
                  <span className="material-icons">search</span>
                  {progress < 30
                    ? "Поиск источников..."
                    : progress < 60
                      ? "Анализ информации..."
                      : progress < 90
                        ? "Компиляция отчёта..."
                        : "Завершение..."}
                </p>
              </div>
            )}
          </div>

          <div className={styles.suggestions}>
            <h3>Примеры тем</h3>
            <div className={styles.suggestionsList}>
              {[
                "Квантовые компьютеры и их применение",
                "Влияние ИИ на рынок труда",
                "Технологии возобновляемой энергии",
                "Космический туризм в 2024",
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setTopic(suggestion)}
                  className={styles.suggestionButton}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
