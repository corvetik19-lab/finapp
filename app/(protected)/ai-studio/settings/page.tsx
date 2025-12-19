"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function AISettingsPage() {
  const [defaultModel, setDefaultModel] = useState("gemini-3-pro-preview");
  const [thinkingLevel, setThinkingLevel] = useState("high");
  const [enableSearch, setEnableSearch] = useState(true);
  const [enableUrlContext, setEnableUrlContext] = useState(true);
  const [showThinking, setShowThinking] = useState(true);

  const handleSave = () => {
    // TODO: Save to localStorage or user preferences
    localStorage.setItem("ai-studio-settings", JSON.stringify({
      defaultModel,
      thinkingLevel,
      enableSearch,
      enableUrlContext,
      showThinking,
    }));
    alert("Настройки сохранены!");
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>
          <span className="material-icons">settings</span>
          Настройки
        </h1>
        <p>Настройки по умолчанию для AI Studio</p>
      </div>

      <div className={styles.sections}>
        <div className={styles.section}>
          <h2>Модель по умолчанию</h2>
          <div className={styles.setting}>
            <label>Текстовая модель</label>
            <select
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
            >
              <option value="gemini-3-pro-preview">🧠 Gemini 3 Pro</option>
              <option value="gemini-2.5-pro">💎 Gemini 2.5 Pro</option>
              <option value="gemini-2.5-flash">⚡ Gemini 2.5 Flash</option>
              <option value="gemini-2.5-flash-lite">💨 Gemini 2.5 Flash-Lite</option>
            </select>
          </div>
        </div>

        <div className={styles.section}>
          <h2>Режим мышления</h2>
          <div className={styles.setting}>
            <label>Уровень Deep Thinking</label>
            <select
              value={thinkingLevel}
              onChange={(e) => setThinkingLevel(e.target.value)}
            >
              <option value="low">🚀 Быстрый (Low) - минимальная задержка</option>
              <option value="medium">⚖️ Средний (Medium) - баланс</option>
              <option value="high">🧠 Глубокий (High) - максимальное качество</option>
            </select>
          </div>

          <div className={styles.toggle}>
            <label>
              <input
                type="checkbox"
                checked={showThinking}
                onChange={(e) => setShowThinking(e.target.checked)}
              />
              <span className={styles.toggleSlider}></span>
              Показывать мысли AI
            </label>
            <p>Отображать процесс рассуждения модели</p>
          </div>
        </div>

        <div className={styles.section}>
          <h2>Инструменты</h2>
          
          <div className={styles.toggle}>
            <label>
              <input
                type="checkbox"
                checked={enableSearch}
                onChange={(e) => setEnableSearch(e.target.checked)}
              />
              <span className={styles.toggleSlider}></span>
              Google Search
            </label>
            <p>Позволяет AI искать актуальную информацию в интернете</p>
          </div>

          <div className={styles.toggle}>
            <label>
              <input
                type="checkbox"
                checked={enableUrlContext}
                onChange={(e) => setEnableUrlContext(e.target.checked)}
              />
              <span className={styles.toggleSlider}></span>
              URL Context
            </label>
            <p>Позволяет AI анализировать содержимое веб-страниц</p>
          </div>
        </div>

        <button onClick={handleSave} className={styles.saveButton}>
          <span className="material-icons">save</span>
          Сохранить настройки
        </button>
      </div>
    </div>
  );
}
