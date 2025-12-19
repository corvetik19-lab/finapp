"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../../images/[model]/page.module.css";
import { getModelById, KieModel, KieInputField } from "@/lib/kie";

interface TaskStatus {
  taskId: string;
  state: string;
  isProcessing: boolean;
  isSuccess: boolean;
  isFailed: boolean;
  resultUrls: string[];
  errorMessage: string | null;
}

export default function AudioModelPage() {
  const params = useParams();
  const router = useRouter();
  const modelId = params.model as string;

  const [model, setModel] = useState<KieModel | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const foundModel = getModelById(modelId);
    if (foundModel && foundModel.category === "audio") {
      setModel(foundModel);
      const defaults: Record<string, unknown> = {};
      foundModel.inputFields.forEach((field) => {
        if (field.defaultValue !== undefined) {
          defaults[field.name] = field.defaultValue;
        }
      });
      setFormData(defaults);
    } else {
      router.push("/ai-studio/kie");
    }
  }, [modelId, router]);

  const pollTaskStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/kie/task-status?taskId=${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка получения статуса");
      }

      setTaskStatus(data);

      if (data.isProcessing) {
        setTimeout(() => pollTaskStatus(id), 2000);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setIsLoading(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTaskStatus(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/kie/create-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: model?.id,
          input: formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка создания задачи");
      }

      pollTaskStatus(data.taskId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setIsLoading(false);
    }
  };

  const handleFieldChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const renderField = (field: KieInputField) => {
    const value = formData[field.name];

    switch (field.type) {
      case "textarea":
        return (
          <textarea
            id={field.name}
            value={(value as string) || ""}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholderRu || field.placeholder}
            required={field.required}
            className={styles.textarea}
            rows={6}
          />
        );

      case "select":
        return (
          <select
            id={field.name}
            value={(value as string) || ""}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            required={field.required}
            className={styles.select}
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.labelRu || opt.label}
              </option>
            ))}
          </select>
        );

      case "slider":
        return (
          <div className={styles.sliderContainer}>
            <input
              type="range"
              id={field.name}
              value={Number(value) || Number(field.defaultValue) || field.min || 0}
              onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value))}
              min={field.min}
              max={field.max}
              step={field.step}
              className={styles.slider}
            />
            <span className={styles.sliderValue}>{String(value ?? field.defaultValue ?? "")}</span>
          </div>
        );

      default:
        return (
          <input
            type={field.type === "number" ? "number" : "text"}
            id={field.name}
            value={(value as string) || ""}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholderRu || field.placeholder}
            required={field.required}
            className={styles.input}
          />
        );
    }
  };

  if (!model) {
    return (
      <div className={styles.loading}>
        ⏳
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/ai-studio/kie" className={styles.backLink}>
          ←
          Назад
        </Link>
        <div className={styles.titleSection}>
          <span className={styles.icon}>{model.icon}</span>
          <div>
            <h1 className={styles.title}>{model.nameRu}</h1>
            <p className={styles.description}>{model.descriptionRu}</p>
          </div>
        </div>
      </header>

      <div className={styles.content}>
        <form onSubmit={handleSubmit} className={styles.form}>
          {model.inputFields.map((field) => (
            <div key={field.name} className={styles.field}>
              <label htmlFor={field.name} className={styles.label}>
                {field.labelRu}
                {field.required && <span className={styles.required}>*</span>}
              </label>
              {renderField(field)}
            </div>
          ))}

          <button
            type="submit"
            disabled={isLoading}
            className={styles.submitButton}
          >
            {isLoading ? (
              <>
                ⏳
                Озвучка...
              </>
            ) : (
              <>
                🎙️
                Озвучить текст
              </>
            )}
          </button>
        </form>

        <div className={styles.results}>
          {error && (
            <div className={styles.error}>
              ❌
              <p>{error}</p>
            </div>
          )}

          {taskStatus && (
            <div className={styles.statusCard}>
              <div className={styles.statusHeader}>
                <span>
                  {taskStatus.isProcessing ? "⏳" : 
                   taskStatus.isSuccess ? "✅" : "❌"}
                </span>
                <span>
                  {taskStatus.isProcessing ? "Генерация аудио..." : 
                   taskStatus.isSuccess ? "Аудио готово!" : "Ошибка"}
                </span>
              </div>
              
              {taskStatus.isProcessing && (
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} />
                </div>
              )}

              {taskStatus.isFailed && taskStatus.errorMessage && (
                <p className={styles.errorMessage}>{taskStatus.errorMessage}</p>
              )}
            </div>
          )}

          {taskStatus?.isSuccess && taskStatus.resultUrls.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {taskStatus.resultUrls.map((url, idx) => (
                <div key={idx} style={{ 
                  padding: "20px", 
                  background: "#f5f5f5", 
                  borderRadius: "12px" 
                }}>
                  <audio 
                    src={url} 
                    controls 
                    style={{ width: "100%", marginBottom: "12px" }}
                  />
                  <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.actionButton}
                      style={{ position: "static" }}
                    >
                      🔗
                    </a>
                    <a
                      href={url}
                      download
                      className={styles.actionButton}
                      style={{ position: "static" }}
                    >
                      ⬇️
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!taskStatus && !error && (
            <div className={styles.placeholder}>
              🎵
              <p>Аудио появится здесь</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
