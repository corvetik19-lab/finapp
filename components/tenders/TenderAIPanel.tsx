"use client";

/**
 * Панель AI анализа тендера
 */

import { useState } from "react";
import { useTenderAI } from "@/lib/hooks/useTenderAI";
import styles from "./TenderAIPanel.module.css";

interface TenderAIPanelProps {
  tenderId: string;
  supplierId?: string;
}

type TabType = "analysis" | "compliance" | "risks" | "summary";

export function TenderAIPanel({ tenderId, supplierId }: TenderAIPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("analysis");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<string | null>(null);
  
  const {
    loading,
    error,
    analyzeTender,
    checkCompliance,
    analyzeRisks,
    generateSummary,
  } = useTenderAI();

  const handleAnalyze = async () => {
    try {
      const analysis = await analyzeTender(tenderId, query || undefined);
      setResult(analysis.analysis);
    } catch {
      // Error handled by hook
    }
  };

  const handleCompliance = async () => {
    if (!supplierId) {
      setResult("Выберите поставщика для проверки соответствия");
      return;
    }
    try {
      const compliance = await checkCompliance(tenderId, supplierId);
      const statusEmoji = compliance.compliant ? "✅" : "❌";
      let text = `${statusEmoji} Соответствие: ${compliance.score}%\n\n`;
      text += "**Требования:**\n";
      compliance.requirements.forEach(req => {
        const icon = req.status === "met" ? "✅" : req.status === "partial" ? "⚠️" : "❌";
        text += `${icon} ${req.requirement}\n   ${req.details}\n\n`;
      });
      if (compliance.recommendations.length > 0) {
        text += "\n**Рекомендации:**\n";
        compliance.recommendations.forEach(r => {
          text += `• ${r}\n`;
        });
      }
      setResult(text);
    } catch {
      // Error handled by hook
    }
  };

  const handleRisks = async () => {
    try {
      const risks = await analyzeRisks(tenderId);
      const riskEmoji = risks.overallRisk === "low" ? "🟢" : risks.overallRisk === "medium" ? "🟡" : "🔴";
      let text = `${riskEmoji} Общий риск: ${risks.overallRisk.toUpperCase()} (${risks.riskScore}%)\n\n`;
      text += "**Риски:**\n";
      risks.risks.forEach(risk => {
        const icon = risk.severity === "low" ? "🟢" : risk.severity === "medium" ? "🟡" : "🔴";
        text += `${icon} **${risk.category}**\n`;
        text += `   ${risk.description}\n`;
        text += `   💡 ${risk.mitigation}\n\n`;
      });
      setResult(text);
    } catch {
      // Error handled by hook
    }
  };

  const handleSummary = async () => {
    try {
      const summary = await generateSummary(tenderId);
      setResult(summary);
    } catch {
      // Error handled by hook
    }
  };

  const handleAction = () => {
    switch (activeTab) {
      case "analysis":
        handleAnalyze();
        break;
      case "compliance":
        handleCompliance();
        break;
      case "risks":
        handleRisks();
        break;
      case "summary":
        handleSummary();
        break;
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span className={styles.icon}>🤖</span>
          AI Анализ
        </h3>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "analysis" ? styles.active : ""}`}
          onClick={() => setActiveTab("analysis")}
        >
          📊 Анализ
        </button>
        <button
          className={`${styles.tab} ${activeTab === "compliance" ? styles.active : ""}`}
          onClick={() => setActiveTab("compliance")}
        >
          ✅ Соответствие
        </button>
        <button
          className={`${styles.tab} ${activeTab === "risks" ? styles.active : ""}`}
          onClick={() => setActiveTab("risks")}
        >
          ⚠️ Риски
        </button>
        <button
          className={`${styles.tab} ${activeTab === "summary" ? styles.active : ""}`}
          onClick={() => setActiveTab("summary")}
        >
          📝 Саммари
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === "analysis" && (
          <div className={styles.querySection}>
            <input
              type="text"
              placeholder="Задайте вопрос о тендере..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={styles.queryInput}
              onKeyDown={(e) => e.key === "Enter" && handleAction()}
            />
          </div>
        )}

        {activeTab === "compliance" && !supplierId && (
          <div className={styles.warning}>
            ⚠️ Выберите поставщика для проверки соответствия
          </div>
        )}

        <button
          className={styles.actionButton}
          onClick={handleAction}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className={styles.spinner} />
              Анализирую...
            </>
          ) : (
            <>
              <span className={styles.buttonIcon}>✨</span>
              {activeTab === "analysis" && "Анализировать"}
              {activeTab === "compliance" && "Проверить соответствие"}
              {activeTab === "risks" && "Оценить риски"}
              {activeTab === "summary" && "Создать саммари"}
            </>
          )}
        </button>

        {error && (
          <div className={styles.error}>
            ❌ {error}
          </div>
        )}

        {result && (
          <div className={styles.result}>
            <pre className={styles.resultText}>{result}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
