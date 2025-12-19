"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import { getModelById, KieModel, KieInputField } from "@/lib/kie";

interface TaskStatus {
  taskId: string;
  state: string;
  progress: number;
  progressText: string;
  isProcessing: boolean;
  isSuccess: boolean;
  isFailed: boolean;
  resultUrls: string[];
  errorMessage: string | null;
}

interface FileUploadState {
  [fieldName: string]: {
    isUploading: boolean;
    preview: string | null;
    error: string | null;
  };
}

export default function ImageModelPage() {
  const params = useParams();
  const router = useRouter();
  const modelId = params.model as string;

  const [model, setModel] = useState<KieModel | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileUploads, setFileUploads] = useState<FileUploadState>({});

  useEffect(() => {
    const foundModel = getModelById(modelId);
    if (foundModel && foundModel.category === "image") {
      setModel(foundModel);
      // Initialize form with default values
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
        setTimeout(() => pollTaskStatus(id), 3000);
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

    // Check if any file is still uploading
    const isAnyFileUploading = Object.values(fileUploads).some(state => state.isUploading);
    if (isAnyFileUploading) {
      setError("Подождите, файл ещё загружается...");
      return;
    }

    // Check required file fields
    if (model) {
      for (const field of model.inputFields) {
        if (field.type === "file" && field.required && !formData[field.name]) {
          setError(`Загрузите файл в поле "${field.labelRu}"`);
          return;
        }
      }
    }

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

      setTaskId(data.taskId);
      pollTaskStatus(data.taskId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setIsLoading(false);
    }
  };

  const handleFieldChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (fieldName: string, file: File) => {
    // Set uploading state
    setFileUploads((prev) => ({
      ...prev,
      [fieldName]: { isUploading: true, preview: null, error: null },
    }));

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileUploads((prev) => ({
        ...prev,
        [fieldName]: { ...prev[fieldName], preview: e.target?.result as string },
      }));
    };
    reader.readAsDataURL(file);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      const response = await fetch("/api/kie/upload-file", {
        method: "POST",
        body: formDataUpload,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка загрузки");
      }

      // Set the file URL in form data
      console.log("File uploaded successfully:", fieldName, data.fileUrl);
      if (data.fileUrl) {
        handleFieldChange(fieldName, data.fileUrl);
      } else {
        console.error("No fileUrl in response:", data);
        throw new Error("Сервер не вернул URL файла");
      }
      setFileUploads((prev) => ({
        ...prev,
        [fieldName]: { ...prev[fieldName], isUploading: false, error: null },
      }));
    } catch (err) {
      setFileUploads((prev) => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          isUploading: false,
          error: err instanceof Error ? err.message : "Ошибка загрузки",
        },
      }));
    }
  };

  const renderField = (field: KieInputField): React.ReactNode => {
    const value = formData[field.name];
    const uploadState: { isUploading: boolean; preview: string | null; error: string | null } | undefined = fileUploads[field.name];

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
            rows={4}
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

      case "checkbox":
        return (
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              id={field.name}
              checked={(value as boolean) || false}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
            />
            <span>{field.labelRu}</span>
          </label>
        );

      case "file":
        return (
          <div className={styles.fileUpload}>
            {/* Preview */}
            {uploadState?.preview && (
              <div className={styles.filePreview}>
                <img src={uploadState.preview} alt="Preview" />
                {uploadState.isUploading && (
                  <div className={styles.uploadingOverlay}>
                    ⏳ Загрузка...
                  </div>
                )}
              </div>
            )}
            
            {/* File input */}
            <label className={styles.fileInputLabel}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(field.name, file);
                }}
                className={styles.fileInput}
              />
              <span className={styles.fileButton}>
                📁 Выбрать файл
              </span>
            </label>
            
            {/* URL or status */}
            {uploadState?.isUploading && (
              <p className={styles.fileUrl}>⏳ Загрузка на сервер...</p>
            )}
            
            {!!value && !uploadState?.isUploading && (
              <p className={styles.fileUrl}>✅ Файл загружен</p>
            )}
            
            {uploadState?.error && (
              <p className={styles.fileError}>❌ {uploadState.error}</p>
            )}
            
            {!value && !uploadState?.isUploading && uploadState?.preview && (
              <p className={styles.fileError}>⚠️ Ошибка загрузки, попробуйте снова</p>
            )}
            
            {!value && !uploadState?.preview && (
              <p className={styles.hint}>Выберите изображение для загрузки</p>
            )}
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
                Генерация...
              </>
            ) : (
              <>
                ✨
                Сгенерировать
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
                  {taskStatus.progressText || (taskStatus.isProcessing ? "Генерация..." : 
                   taskStatus.isSuccess ? "Готово!" : "Ошибка")}
                </span>
                {taskStatus.isProcessing && (
                  <span className={styles.progressPercent}>{taskStatus.progress}%</span>
                )}
              </div>
              
              {taskStatus.isProcessing && (
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill} 
                    style={{ width: `${taskStatus.progress}%` }}
                  />
                </div>
              )}

              {taskStatus.isFailed && taskStatus.errorMessage && (
                <p className={styles.errorMessage}>{taskStatus.errorMessage}</p>
              )}
            </div>
          )}

          {taskStatus?.isSuccess && taskStatus.resultUrls.length > 0 && (
            <div className={styles.gallery}>
              {taskStatus.resultUrls.map((url, idx) => (
                <div key={idx} className={styles.imageCard}>
                  <img src={url} alt={`Результат ${idx + 1}`} />
                  <div className={styles.imageActions}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.actionButton}
                    >
                      🔗
                    </a>
                    <a
                      href={url}
                      download
                      className={styles.actionButton}
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
              🖼️
              <p>Результаты появятся здесь</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
