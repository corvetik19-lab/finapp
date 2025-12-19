/**
 * React hook для работы с AI анализом тендеров
 */

import { useState, useCallback } from "react";

interface DocumentStatus {
  status: "queued" | "processing" | "completed" | "failed";
  chunksCount: number;
  error?: string;
}

interface TenderAnalysis {
  analysis: string;
  relevantChunks: Array<{
    text: string;
    similarity: number;
  }>;
  entities: Array<{
    type: string;
    name: string;
  }>;
}

interface ComplianceResult {
  compliant: boolean;
  score: number;
  requirements: Array<{
    requirement: string;
    status: "met" | "not_met" | "partial" | "unknown";
    details: string;
  }>;
  recommendations: string[];
}

interface RiskAnalysis {
  overallRisk: "low" | "medium" | "high";
  riskScore: number;
  risks: Array<{
    category: string;
    description: string;
    severity: "low" | "medium" | "high";
    mitigation: string;
  }>;
}

export function useTenderAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processDocument = useCallback(async (documentId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process-document", documentId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to process document");
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDocumentStatus = useCallback(async (documentId: string): Promise<DocumentStatus> => {
    try {
      const response = await fetch("/api/ai/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "document-status", documentId }),
      });

      if (!response.ok) {
        throw new Error("Failed to get document status");
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    }
  }, []);

  const analyzeTender = useCallback(async (
    tenderId: string, 
    query?: string
  ): Promise<TenderAnalysis> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze-tender", tenderId, query }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to analyze tender");
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkCompliance = useCallback(async (
    tenderId: string,
    supplierId: string
  ): Promise<ComplianceResult> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check-compliance", tenderId, supplierId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to check compliance");
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzeRisks = useCallback(async (tenderId: string): Promise<RiskAnalysis> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze-risks", tenderId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to analyze risks");
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateSummary = useCallback(async (tenderId: string): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-summary", tenderId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate summary");
      }

      const data = await response.json();
      return data.summary;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTenderDocuments = useCallback(async (tenderId: string) => {
    try {
      const response = await fetch(
        `/api/ai/tenders?tenderId=${tenderId}&action=documents`
      );

      if (!response.ok) {
        throw new Error("Failed to get documents");
      }

      const data = await response.json();
      return data.documents;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    }
  }, []);

  const getTenderEntities = useCallback(async (tenderId: string) => {
    try {
      const response = await fetch(
        `/api/ai/tenders?tenderId=${tenderId}&action=entities`
      );

      if (!response.ok) {
        throw new Error("Failed to get entities");
      }

      const data = await response.json();
      return data.entities;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    }
  }, []);

  const getTenderSummaries = useCallback(async (tenderId: string) => {
    try {
      const response = await fetch(
        `/api/ai/tenders?tenderId=${tenderId}&action=summaries`
      );

      if (!response.ok) {
        throw new Error("Failed to get summaries");
      }

      const data = await response.json();
      return data.summaries;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    }
  }, []);

  return {
    loading,
    error,
    processDocument,
    getDocumentStatus,
    analyzeTender,
    checkCompliance,
    analyzeRisks,
    generateSummary,
    getTenderDocuments,
    getTenderEntities,
    getTenderSummaries,
  };
}
