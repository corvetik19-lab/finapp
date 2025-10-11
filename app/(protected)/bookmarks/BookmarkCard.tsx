"use client";

import { useState } from "react";
import Image from "next/image";
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
  bookmark: Bookmark;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onVisit: (url: string, id: string) => void;
};

export default function BookmarkCard({
  bookmark,
  onEdit,
  onDelete,
  onToggleFavorite,
  onVisit,
}: Props) {
  const [imageError, setImageError] = useState(false);

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  const getFaviconUrl = () => {
    if (bookmark.favicon_url && !imageError) {
      return bookmark.favicon_url;
    }
    try {
      const domain = new URL(bookmark.url).origin;
      return `${domain}/favicon.ico`;
    } catch {
      return null;
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          <div className={styles.titleRow}>
            {getFaviconUrl() && (
              <Image
                src={getFaviconUrl()!}
                alt=""
                width={24}
                height={24}
                className={styles.favicon}
                onError={() => setImageError(true)}
                unoptimized
              />
            )}
            <h3>{bookmark.title}</h3>
          </div>
          <button
            onClick={() => onToggleFavorite(bookmark.id, bookmark.is_favorite)}
            className={styles.favoriteBtn}
            title={bookmark.is_favorite ? "Убрать из избранного" : "Добавить в избранное"}
          >
            <span className="material-icons">
              {bookmark.is_favorite ? "star" : "star_border"}
            </span>
          </button>
        </div>

        {bookmark.description && (
          <p className={styles.cardDescription}>{bookmark.description}</p>
        )}
      </div>

      <div className={styles.cardBody}>
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.urlLink}
          onClick={(e) => {
            e.preventDefault();
            onVisit(bookmark.url, bookmark.id);
          }}
        >
          <span className="material-icons">link</span>
          {getDomain(bookmark.url)}
        </a>
      </div>

      <div className={styles.cardMeta}>
        {bookmark.category && (
          <span className={styles.badge}>{bookmark.category}</span>
        )}

        {bookmark.tags.length > 0 && (
          <div className={styles.tags}>
            {bookmark.tags.map((tag, i) => (
              <span key={i} className={styles.tag}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.cardActions}>
        <button
          onClick={() => onVisit(bookmark.url, bookmark.id)}
          className={`${styles.actionBtn} ${styles.visitBtn}`}
          title="Открыть ссылку"
        >
          <span className="material-icons">open_in_new</span>
          Открыть
        </button>
        <button
          onClick={() => onEdit(bookmark)}
          className={styles.actionBtn}
          title="Редактировать"
        >
          <span className="material-icons">edit</span>
        </button>
        <button
          onClick={() => onDelete(bookmark.id)}
          className={`${styles.actionBtn} ${styles.deleteBtn}`}
          title="Удалить"
        >
          <span className="material-icons">delete</span>
        </button>
      </div>
    </div>
  );
}
