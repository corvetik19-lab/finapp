"use client";

import { useState, useRef, useEffect } from "react";
import { 
  X, Copy, Check, Play, Download, Maximize2, Minimize2,
  Code, FileCode, Terminal
} from "lucide-react";
import styles from "./CodeCanvas.module.css";

interface CodeCanvasProps {
  code: string;
  language: string;
  onClose: () => void;
  onUpdate?: (code: string) => void;
}

export default function CodeCanvas({ code, language, onClose, onUpdate }: CodeCanvasProps) {
  const [editedCode, setEditedCode] = useState(code);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditedCode(code);
  }, [code]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = getFileExtension(language);
    const blob = new Blob([editedCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRun = async () => {
    if (language !== "javascript" && language !== "js") {
      setOutput("⚠️ Выполнение доступно только для JavaScript");
      return;
    }

    setIsRunning(true);
    setOutput(null);

    try {
      // Создаем безопасную среду выполнения
      const logs: string[] = [];
      const customConsole = {
        log: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
        error: (...args: unknown[]) => logs.push("❌ " + args.map(String).join(" ")),
        warn: (...args: unknown[]) => logs.push("⚠️ " + args.map(String).join(" ")),
      };

      // Выполняем код
      const fn = new Function("console", editedCode);
      const result = fn(customConsole);

      if (result !== undefined) {
        logs.push(`→ ${String(result)}`);
      }

      setOutput(logs.join("\n") || "✓ Выполнено (без вывода)");
    } catch (error) {
      setOutput(`❌ Ошибка: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getFileExtension = (lang: string): string => {
    const extensions: Record<string, string> = {
      javascript: "js",
      js: "js",
      typescript: "ts",
      ts: "ts",
      python: "py",
      java: "java",
      cpp: "cpp",
      c: "c",
      csharp: "cs",
      go: "go",
      rust: "rs",
      ruby: "rb",
      php: "php",
      swift: "swift",
      kotlin: "kt",
      html: "html",
      css: "css",
      json: "json",
      sql: "sql",
      bash: "sh",
      shell: "sh",
    };
    return extensions[lang.toLowerCase()] || "txt";
  };

  const getLanguageIcon = () => {
    switch (language.toLowerCase()) {
      case "javascript":
      case "js":
      case "typescript":
      case "ts":
        return <FileCode size={16} />;
      case "bash":
      case "shell":
        return <Terminal size={16} />;
      default:
        return <Code size={16} />;
    }
  };

  return (
    <div className={`${styles.canvas} ${isFullscreen ? styles.fullscreen : ""}`}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {getLanguageIcon()}
          <span className={styles.language}>{language}</span>
        </div>
        <div className={styles.headerActions}>
          {(language === "javascript" || language === "js") && (
            <button 
              className={styles.actionBtn} 
              onClick={handleRun}
              disabled={isRunning}
              title="Выполнить"
            >
              <Play size={14} />
              {isRunning ? "..." : "Run"}
            </button>
          )}
          <button className={styles.actionBtn} onClick={handleCopy} title="Копировать">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <button className={styles.actionBtn} onClick={handleDownload} title="Скачать">
            <Download size={14} />
          </button>
          <button 
            className={styles.actionBtn} 
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Свернуть" : "На весь экран"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button className={styles.closeBtn} onClick={onClose} title="Закрыть">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className={styles.editor}>
        <textarea
          ref={textareaRef}
          value={editedCode}
          onChange={(e) => {
            setEditedCode(e.target.value);
            onUpdate?.(e.target.value);
          }}
          className={styles.codeArea}
          spellCheck={false}
        />
      </div>

      {output && (
        <div className={styles.output}>
          <div className={styles.outputHeader}>
            <Terminal size={14} />
            <span>Вывод</span>
          </div>
          <pre className={styles.outputContent}>{output}</pre>
        </div>
      )}
    </div>
  );
}
