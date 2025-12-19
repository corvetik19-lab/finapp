"use client";

import { useState, useRef } from "react";
import styles from "./page.module.css";

export default function AIDocumentPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    summary: string;
    keyPoints: string[];
  } | null>(null);
  const [query, setQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file || isAnalyzing) return;

    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("query", query);

      const res = await fetch("/api/ai-studio/document", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Ошибка анализа");

      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error("Document analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>
          <span className="material-icons">description</span>
          Анализ документов
        </h1>
        <p>Загрузите PDF до 1000 страниц для мультимодального анализа</p>
      </div>

      <div className={styles.content}>
        <div className={styles.mainColumn}>
          {result ? (
            <div className={styles.resultSection}>
              <h2>
                <span className="material-icons">summarize</span>
                Результат анализа
              </h2>

              <div className={styles.summary}>
                <h3>Краткое содержание</h3>
                <p>{result.summary}</p>
              </div>

              {result.keyPoints.length > 0 && (
                <div className={styles.keyPoints}>
                  <h3>Ключевые моменты</h3>
                  <ul>
                    {result.keyPoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.placeholder}>
              <span className="material-icons">article</span>
              <p>Результаты анализа появятся здесь</p>
            </div>
          )}
        </div>

        <div className={styles.sidebarColumn}>
          <div className={styles.uploadSection}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt"
              className={styles.fileInput}
            />

            <div
              className={styles.dropZone}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div className={styles.fileInfo}>
                  <span className="material-icons">article</span>
                  <div>
                    <p className={styles.fileName}>{file.name}</p>
                    <p className={styles.fileSize}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <span className="material-icons">cloud_upload</span>
                  <p>Нажмите или перетащите файл</p>
                  <span className={styles.hint}>PDF, DOC, DOCX, TXT</span>
                </>
              )}
            </div>

            <div className={styles.querySection}>
              <label>Что нужно найти/проанализировать?</label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Опционально: укажите конкретный вопрос или задачу..."
                rows={3}
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!file || isAnalyzing}
              className={styles.analyzeButton}
            >
              <span className="material-icons">
                {isAnalyzing ? "hourglass_empty" : "analytics"}
              </span>
              {isAnalyzing ? "Анализ..." : "Анализировать документ"}
            </button>
          </div>

          <div className={styles.features}>
            <div className={styles.feature}>
              <span className="material-icons">find_in_page</span>
              <div>
                <strong>До 1000 страниц</strong>
                <p>Анализ больших документов</p>
              </div>
            </div>
            <div className={styles.feature}>
              <span className="material-icons">auto_awesome</span>
              <div>
                <strong>Мультимодальный</strong>
                <p>Текст, таблицы, изображения</p>
              </div>
            </div>
            <div className={styles.feature}>
              <span className="material-icons">question_answer</span>
              <div>
                <strong>Q&A</strong>
                <p>Ответы на вопросы по документу</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
