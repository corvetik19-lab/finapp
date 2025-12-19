"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, FileText, Loader2, Copy, Download, RefreshCw, AlertCircle } from "lucide-react";
import styles from "../live-photos/page.module.css";

export default function TranscribePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      // Конвертируем файл в base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const mediaBase64 = await base64Promise;

      const response = await fetch("/api/ai-studio/tools/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaBase64,
          mimeType: file.type,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка транскрибации");
      }

      setResult(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transcription-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/ai-studio/tools" className={styles.backButton}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className={styles.title}>Транскрибация</h1>
          <p className={styles.subtitle}>Gemini Flash • Аудио и видео в текст</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${styles.active}`}>Создать</button>
        <button className={styles.tab}>История</button>
      </div>

      <div className={styles.content}>
        <div className={styles.uploadSection}>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*"
            onChange={handleFileSelect}
            className={styles.fileInput}
            id="file-upload"
          />
          
          {!file ? (
            <label htmlFor="file-upload" className={styles.uploadArea}>
              <Upload className={styles.uploadIcon} />
              <span className={styles.uploadText}>Загрузите аудио или видео</span>
              <span className={styles.uploadHint}>MP3, WAV, MP4, WebM и другие</span>
            </label>
          ) : (
            <div className={styles.previewArea} style={{ padding: '24px', textAlign: 'center' }}>
              <FileText style={{ width: 48, height: 48, color: '#3b82f6', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 500, marginBottom: 4 }}>{file.name}</p>
              <p style={{ fontSize: 13, color: '#666' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <button className={styles.changeButton} onClick={handleReset} style={{ position: 'relative', top: 'auto', right: 'auto', marginTop: 16 }}>
                <RefreshCw className="h-4 w-4" />
                Изменить
              </button>
            </div>
          )}
        </div>

        <button
          className={styles.generateButton}
          onClick={handleProcess}
          disabled={!file || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Распознавание...</span>
            </>
          ) : (
            <>
              <FileText className="h-5 w-5" />
              <span>Транскрибировать</span>
            </>
          )}
        </button>

        {error && (
          <div className={styles.errorBox} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16, background: '#fef2f2', borderRadius: 8, color: '#dc2626' }}>
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className={styles.resultSection}>
            <div className={styles.resultHeader}>
              <h3>Результат</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={styles.downloadButton} onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                  {copied ? "Скопировано!" : "Копировать"}
                </button>
                <button className={styles.downloadButton} onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                  Скачать TXT
                </button>
              </div>
            </div>
            <div style={{ padding: 20 }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6 }}>{result}</pre>
            </div>
          </div>
        )}

        <div className={styles.infoBox}>
          <p>
            <strong>Gemini Flash</strong> распознаёт речь в аудио и видео файлах.
            Поддерживает множество языков и добавляет таймкоды.
          </p>
        </div>
      </div>
    </div>
  );
}
