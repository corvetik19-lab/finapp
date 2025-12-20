"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ArrowLeft, 
  Layers, 
  Loader2, 
  Download, 
  AlertCircle,
  Upload,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { IMAGE_MODELS, KieModel } from "@/lib/kie";
import styles from "../live-photos/page.module.css";

// Модели Flux Kontext
const FLUX_MODELS = IMAGE_MODELS.filter(m => m.id.startsWith("flux-kontext"));

export default function FluxKontextPage() {
  const [activeTab, setActiveTab] = useState<"create" | "edit" | "history">("create");
  const [selectedModel, setSelectedModel] = useState<KieModel>(FLUX_MODELS[0]);
  const [prompt, setPrompt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [promptUpsampling, setPromptUpsampling] = useState(false);
  const [safetyTolerance, setSafetyTolerance] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Введите описание изображения");
      return;
    }

    const isEdit = selectedModel.type === "image-edit";
    if (isEdit && !imageFile) {
      setError("Загрузите изображение для редактирования");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultUrl(null);

    try {
      // Для демо - имитация API вызова
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Заглушка для демо
      setResultUrl("https://picsum.photos/1024/1024?random=" + Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (resultUrl) {
      const a = document.createElement("a");
      a.href = resultUrl;
      a.download = `flux-kontext-${Date.now()}.png`;
      a.target = "_blank";
      a.click();
    }
  };

  const isEdit = selectedModel.type === "image-edit";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/ai-studio/tools" className={styles.backButton}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className={styles.title}>Flux Kontext</h1>
          <p className={styles.subtitle}>Kie.ai • Генерация и редактирование изображений</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "create" ? styles.active : ""}`}
          onClick={() => {
            setActiveTab("create");
            const model = FLUX_MODELS.find(m => m.type === "text-to-image");
            if (model) setSelectedModel(model);
          }}
        >
          Создать
        </button>
        <button
          className={`${styles.tab} ${activeTab === "edit" ? styles.active : ""}`}
          onClick={() => {
            setActiveTab("edit");
            const model = FLUX_MODELS.find(m => m.type === "image-edit");
            if (model) setSelectedModel(model);
          }}
        >
          Редактировать
        </button>
        <button
          className={`${styles.tab} ${activeTab === "history" ? styles.active : ""}`}
          onClick={() => setActiveTab("history")}
        >
          История
        </button>
      </div>

      {(activeTab === "create" || activeTab === "edit") && (
        <div className={styles.content}>
          {/* Model Selection */}
          <div className={styles.modelSection}>
            <span className={styles.label}>Модель</span>
            <select
              className={styles.select}
              value={selectedModel.id}
              onChange={(e) => {
                const model = FLUX_MODELS.find(m => m.id === e.target.value);
                if (model) setSelectedModel(model);
              }}
            >
              {activeTab === "create" ? (
                <>
                  {FLUX_MODELS.filter(m => m.type === "text-to-image").map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.icon} {model.nameRu}
                    </option>
                  ))}
                </>
              ) : (
                <>
                  {FLUX_MODELS.filter(m => m.type === "image-edit").map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.icon} {model.nameRu}
                    </option>
                  ))}
                </>
              )}
            </select>
            <p className={styles.modelDescription}>{selectedModel.descriptionRu}</p>
          </div>

          {/* Image Upload for Edit */}
          {isEdit && (
            <div className={styles.modelSection}>
              <span className={styles.label}>Изображение для редактирования</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className={styles.fileInput}
              />
              {imagePreview ? (
                <div className={styles.previewArea}>
                  <Image src={imagePreview} alt="Preview" className={styles.previewImage} width={400} height={400} unoptimized />
                  <button
                    className={styles.changeButton}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <RefreshCw size={14} />
                    Заменить
                  </button>
                </div>
              ) : (
                <div 
                  className={styles.uploadArea}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={32} className={styles.uploadIcon} />
                  <p className={styles.uploadText}>Загрузите изображение</p>
                  <p className={styles.uploadHint}>PNG, JPG до 10MB</p>
                </div>
              )}
            </div>
          )}

          {/* Prompt */}
          <div className={styles.promptSection}>
            <span className={styles.promptLabel}>
              {isEdit ? "Промпт редактирования" : "Описание изображения"}
            </span>
            <textarea
              className={styles.promptInput}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                isEdit 
                  ? "Опишите изменения, которые хотите внести..."
                  : "Опишите желаемое изображение детально..."
              }
              rows={3}
            />
          </div>

          {/* Aspect Ratio (only for generation) */}
          {!isEdit && (
            <div className={styles.modelSection}>
              <span className={styles.label}>Соотношение сторон</span>
              <select
                className={styles.select}
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
              >
                <option value="1:1">1:1 Квадрат</option>
                <option value="16:9">16:9 Широкий экран</option>
                <option value="9:16">9:16 Мобильный</option>
                <option value="4:3">4:3 Стандарт</option>
                <option value="3:4">3:4 Портрет</option>
                <option value="21:9">21:9 Кинематографический</option>
              </select>
            </div>
          )}

          {/* Prompt Upsampling (only for generation) */}
          {!isEdit && (
            <div className={styles.modelSection}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={promptUpsampling}
                  onChange={(e) => setPromptUpsampling(e.target.checked)}
                />
                <span className={styles.label}>Улучшение промпта</span>
              </label>
              <p className={styles.modelDescription}>
                ИИ автоматически расширит и улучшит ваш промпт для лучших результатов
              </p>
            </div>
          )}

          {/* Safety Tolerance */}
          <div className={styles.modelSection}>
            <span className={styles.label}>Уровень безопасности: {safetyTolerance}</span>
            <input
              type="range"
              min={0}
              max={isEdit ? 2 : 6}
              step={1}
              value={safetyTolerance}
              onChange={(e) => setSafetyTolerance(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <p className={styles.modelDescription}>
              0 = строгий, {isEdit ? 2 : 6} = свободный (для художественного контента)
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className={styles.infoBox} style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
              <p style={{ color: "#dc2626", display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={16} />
                {error}
              </p>
            </div>
          )}

          {/* Generate Button */}
          <button
            className={styles.generateButton}
            onClick={handleGenerate}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {isEdit ? "Редактирование..." : "Генерация..."}
              </>
            ) : (
              <>
                {isEdit ? <Layers size={18} /> : <Sparkles size={18} />}
                {isEdit ? "Редактировать" : "Создать изображение"}
              </>
            )}
          </button>

          {/* Result */}
          {resultUrl && (
            <div className={styles.resultSection}>
              <div className={styles.resultHeader}>
                <h3>Результат</h3>
                <button className={styles.downloadButton} onClick={handleDownload}>
                  <Download size={14} />
                  Скачать
                </button>
              </div>
              <div style={{ padding: 20 }}>
                <Image 
                  src={resultUrl} 
                  alt="Generated" 
                  width={600}
                  height={600}
                  style={{ 
                    width: "100%", 
                    maxHeight: 600, 
                    objectFit: "contain",
                    borderRadius: 8
                  }} 
                  unoptimized
                />
              </div>
            </div>
          )}

          {/* Info */}
          <div className={styles.infoBox}>
            <p>
              <strong>Flux Kontext</strong> — мощная модель для генерации и редактирования изображений:
              <br />• <strong>Pro</strong> — сбалансированное качество и скорость
              <br />• <strong>Max</strong> — максимальное качество для сложных сцен
              <br />• <strong>Edit</strong> — редактирование существующих изображений
            </p>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className={styles.content}>
          <div className={styles.infoBox}>
            <p>История генераций будет доступна после подключения к Kie.ai API</p>
          </div>
        </div>
      )}
    </div>
  );
}
