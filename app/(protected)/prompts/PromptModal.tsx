"use client";

import { useState, useEffect } from "react";
import styles from "./Prompts.module.css";

type Prompt = {
  id: string;
  title: string;
  description: string | null;
  prompt_text: string;
  category: string | null;
  tags: string[];
  ai_model: string;
  is_favorite: boolean;
};

type Props = {
  prompt: Prompt | null;
  onClose: () => void;
  categories: string[];
  aiModels: string[];
};

export default function PromptModal({ prompt, onClose, categories, aiModels }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [promptText, setPromptText] = useState("");
  const [category, setCategory] = useState("");
  const [aiModel, setAiModel] = useState("Universal");
  const [tagsInput, setTagsInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title);
      setDescription(prompt.description || "");
      setPromptText(prompt.prompt_text);
      setCategory(prompt.category || "");
      setAiModel(prompt.ai_model);
      setTagsInput(prompt.tags.join(", "));
    }
  }, [prompt]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !promptText.trim()) {
      alert("Заполните название и текст промпта");
      return;
    }

    setIsSaving(true);

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);

      const body = {
        title: title.trim(),
        description: description.trim() || null,
        prompt_text: promptText.trim(),
        category: category || null,
        tags,
        ai_model: aiModel,
      };

      const url = prompt ? `/api/prompts/${prompt.id}` : "/api/prompts";
      const method = prompt ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onClose();
      } else {
        const data = await res.json();
        alert(`Ошибка: ${data.error}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{prompt ? "Редактировать промпт" : "Создать промпт"}</h2>
          <button 
            type="button"
            onClick={onClose} 
            className={styles.closeBtn}
            aria-label="Закрыть"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label htmlFor="title">
              Название <span className={styles.required}>*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Генерация идей для статьи"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Описание</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание промпта..."
              className={styles.textarea}
              rows={2}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="promptText">
              Текст промпта <span className={styles.required}>*</span>
            </label>
            <textarea
              id="promptText"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Введите текст промпта..."
              className={styles.textarea}
              rows={8}
              required
            />
            <div className={styles.charCount}>
              {promptText.length} символов
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="category">Категория</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={styles.select}
              >
                <option value="">Не выбрано</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="aiModel">Нейросеть</label>
              <select
                id="aiModel"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className={styles.select}
              >
                {aiModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="tags">Теги</label>
            <input
              id="tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Через запятую: идеи, контент, маркетинг"
              className={styles.input}
            />
            <div className={styles.hint}>
              Теги помогут быстрее найти промпт
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelBtn}
              disabled={isSaving}
            >
              Отмена
            </button>
            <button
              type="submit"
              className={styles.saveBtn}
              disabled={isSaving}
            >
              {isSaving ? "Сохранение..." : prompt ? "Сохранить" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
