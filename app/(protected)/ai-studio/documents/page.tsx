"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  Trash2, 
  Loader2, 
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  File,
  FileImage,
  FileSpreadsheet
} from "lucide-react";
import styles from "./page.module.css";

interface RAGDocument {
  id: string;
  name: string;
  file_type: string | null;
  file_size: number | null;
  status: "pending" | "processing" | "ready" | "error";
  error_message: string | null;
  created_at: string;
}

const fileTypeIcons: Record<string, React.ReactNode> = {
  "application/pdf": <FileText className="h-5 w-5" />,
  "text/plain": <File className="h-5 w-5" />,
  "image/": <FileImage className="h-5 w-5" />,
  "application/vnd": <FileSpreadsheet className="h-5 w-5" />,
};

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File className="h-5 w-5" />;
  for (const [key, icon] of Object.entries(fileTypeIcons)) {
    if (mimeType.startsWith(key)) return icon;
  }
  return <File className="h-5 w-5" />;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<RAGDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    try {
      const response = await fetch("/api/ai-studio/rag/documents");
      if (!response.ok) throw new Error("Failed to load documents");
      const data = await response.json();
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        // Читаем файл как base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const fileBase64 = await base64Promise;

        // Загружаем в Supabase Storage и создаём документ
        const response = await fetch("/api/ai-studio/rag/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            file_path: `rag/${Date.now()}-${file.name}`,
            file_type: file.type,
            file_size: file.size,
            metadata: { base64: fileBase64 },
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Ошибка загрузки файла");
        }
      }

      // Перезагружаем список документов
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить документ?")) return;

    try {
      const response = await fetch(`/api/ai-studio/rag/documents/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
    }
  }

  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    pending: { label: "Ожидание", icon: <Clock className="h-4 w-4" />, color: "#f59e0b" },
    processing: { label: "Обработка", icon: <Loader2 className="h-4 w-4 animate-spin" />, color: "#3b82f6" },
    ready: { label: "Готов", icon: <CheckCircle className="h-4 w-4" />, color: "#22c55e" },
    error: { label: "Ошибка", icon: <AlertCircle className="h-4 w-4" />, color: "#ef4444" },
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Link href="/ai-studio" className={styles.backButton}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className={styles.title}>База знаний (RAG)</h1>
          <p className={styles.subtitle}>Загрузите документы для поиска и анализа</p>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <div className={styles.searchBox}>
          <Search className="h-4 w-4" />
          <input
            type="text"
            placeholder="Поиск документов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.doc,.docx,.md"
          onChange={handleFileUpload}
          className={styles.fileInput}
          id="file-upload"
        />
        <label htmlFor="file-upload" className={styles.uploadButton}>
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Загрузка...</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span>Загрузить файлы</span>
            </>
          )}
        </label>
      </div>

      {/* Error */}
      {error && (
        <div className={styles.errorBox}>
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Content */}
      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loading}>
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Загрузка документов...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className={styles.emptyState}>
            <FileText className="h-12 w-12" />
            <h3>Нет документов</h3>
            <p>Загрузите PDF, TXT, DOC или MD файлы для создания базы знаний</p>
          </div>
        ) : (
          <div className={styles.documentsList}>
            {filteredDocuments.map((doc) => {
              const status = statusLabels[doc.status] || statusLabels.pending;
              return (
                <div key={doc.id} className={styles.documentItem}>
                  <div className={styles.documentIcon}>
                    {getFileIcon(doc.file_type)}
                  </div>
                  <div className={styles.documentInfo}>
                    <div className={styles.documentName}>{doc.name}</div>
                    <div className={styles.documentMeta}>
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>•</span>
                      <span>{formatDate(doc.created_at)}</span>
                    </div>
                  </div>
                  <div className={styles.documentStatus} style={{ color: status.color }}>
                    {status.icon}
                    <span>{status.label}</span>
                  </div>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDelete(doc.id)}
                    title="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info */}
      <div className={styles.infoBox}>
        <p>
          <strong>RAG (Retrieval-Augmented Generation)</strong> позволяет ИИ искать 
          информацию в ваших документах и давать более точные ответы на основе ваших данных.
        </p>
      </div>
    </div>
  );
}
