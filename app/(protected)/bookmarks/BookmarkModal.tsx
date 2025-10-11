"use client";

import { useState, useEffect } from "react";
import styles from "./Bookmarks.module.css";

type Bookmark = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string | null;
  tags: string[];
  is_favorite: boolean;
  favicon_url: string | null;
  visit_count: number;
  created_at: string;
  last_visited_at: string | null;
};

type Props = {
  bookmark: Bookmark | null;
  onClose: (updatedBookmark?: Bookmark) => void;
  categories: string[];
};

export default function BookmarkModal({ bookmark, onClose, categories }: Props) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (bookmark) {
      setTitle(bookmark.title);
      setUrl(bookmark.url);
      setDescription(bookmark.description || "");
      setCategory(bookmark.category || "");
      setTagsInput(bookmark.tags.join(", "));
    }
  }, [bookmark]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !url.trim()) {
      alert("Заполните название и URL");
      return;
    }

    setIsSaving(true);

    try {
      // Нормализация URL - добавить http:// если нет протокола
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'http://' + normalizedUrl;
      }

      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);

      // Попытка получить favicon
      let favicon_url = null;
      try {
        const domain = new URL(normalizedUrl).origin;
        favicon_url = `${domain}/favicon.ico`;
      } catch {
        // Игнорируем ошибку
      }

      const body = {
        title: title.trim(),
        url: normalizedUrl,
        description: description.trim() || null,
        category: category || null,
        tags,
        favicon_url,
      };

      const apiUrl = bookmark ? `/api/bookmarks/${bookmark.id}` : "/api/bookmarks";
      const method = bookmark ? "PATCH" : "POST";

      const res = await fetch(apiUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        onClose(data.bookmark);
      } else {
        const errorData = await res.json();
        alert(`Ошибка: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={() => onClose()}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{bookmark ? "Редактировать закладку" : "Добавить закладку"}</h2>
          <button 
            type="button"
            onClick={() => onClose()} 
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
              placeholder="Например: Google Документы"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="url">
              URL <span className={styles.required}>*</span>
            </label>
            <input
              id="url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="example.com или https://example.com"
              className={styles.input}
              required
            />
            <div className={styles.hint}>
              Можно вводить с протоколом (https://) или без (добавится автоматически)
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Описание</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание ссылки..."
              className={styles.textarea}
              rows={3}
            />
          </div>

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
            <label htmlFor="tags">Теги</label>
            <input
              id="tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Через запятую: работа, документы, облако"
              className={styles.input}
            />
            <div className={styles.hint}>
              Теги помогут быстрее найти закладку
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={() => onClose()}
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
              {isSaving ? "Сохранение..." : bookmark ? "Сохранить" : "Добавить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
