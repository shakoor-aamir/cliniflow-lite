"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { KpiCard } from "@/components/ui/KpiCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";

type DocumentType =
  | "Protocol Summary"
  | "Clinical Study Report Section"
  | "Investigator Communication"
  | "Regulatory Response Draft";

type AnalysisIssue = {
  category: "Completeness" | "Clarity" | "Consistency" | "Compliance Risk";
  severity: "Low" | "Medium" | "High";
  explanation: string;
};

type AnalysisResponse = {
  qualityScore: number;
  readyForReview: boolean;
  missingSections: string[];
  issues: AnalysisIssue[];
  suggestions: string[];
  summary: string;
  _meta: {
    mode: "live" | "mock";
    reason?: string;
    errorType?: string;
    status?: number;
    timestamp: string;
  };
};

type HealthResponse = {
  hasOpenAIKey: boolean;
  mode: "live" | "mock";
  message: string;
};

type DebugInfo = {
  mode: "live" | "mock";
  apiStatus: string;
  timestamp: string;
  reason?: string;
  errorType?: string;
  status?: number;
};

type StatusPresentation = {
  tone: "live" | "mock" | "error";
  label: string;
  heading: string;
  detail: string;
};

type AnalysisHistoryItem = {
  id: string;
  createdAt: string;
  documentType: DocumentType;
  content: string;
  result: AnalysisResponse;
};

type UploadState = {
  fileName: string;
  message?: string;
  error?: string;
};

const documentTypes: DocumentType[] = [
  "Protocol Summary",
  "Clinical Study Report Section",
  "Investigator Communication",
  "Regulatory Response Draft",
];

const HISTORY_STORAGE_KEY = "cliniflow-lite-recent-analyses";
const MAX_HISTORY_ITEMS = 5;

function getStatusPresentation(
  health: HealthResponse | null,
  result: AnalysisResponse | null,
): StatusPresentation {
  if (result?._meta.mode === "mock" && result._meta.reason !== "OPENAI_API_KEY missing") {
    return {
      tone: "error",
      label: "API Error",
      heading: "Fallback mode active",
      detail: result._meta.reason ?? "The service returned an unexpected response.",
    };
  }

  if (health?.mode === "mock") {
    return {
      tone: "mock",
      label: "Mock",
      heading: "Mock mode active",
      detail: health.message,
    };
  }

  if (health?.mode === "live") {
    return {
      tone: "live",
      label: "Live",
      heading: "Live analysis available",
      detail: health.message,
    };
  }

  return {
    tone: "mock",
    label: "Checking",
    heading: "Checking environment",
    detail: "Retrieving current system status.",
  };
}

function getUserSuggestion(meta: AnalysisResponse["_meta"]) {
  if (meta.reason === "OPENAI_API_KEY missing") {
    return "Add OPENAI_API_KEY to enable live analysis.";
  }

  if (meta.errorType === "insufficient_quota") {
    return "Update billing or quota settings, then retry the request.";
  }

  if (meta.errorType === "rate_limit" || meta.status === 429) {
    return "Retry later or reduce request volume during testing.";
  }

  if (meta.errorType === "invalid_json") {
    return "Retry the analysis. If the issue persists, review server logs.";
  }

  return "Review server diagnostics and retry the analysis.";
}

function getServiceNotice(meta: AnalysisResponse["_meta"]) {
  if (meta.status === 429) {
    return "AI service temporarily unavailable. This is usually due to rate limits or missing billing. The system is running in fallback mode.";
  }

  return null;
}

function buildDebugInfo(result: AnalysisResponse): DebugInfo {
  return {
    mode: result._meta.mode,
    apiStatus:
      result._meta.mode === "live"
        ? "Operational"
        : result._meta.reason === "OPENAI_API_KEY missing"
          ? "Mock mode active"
          : "Fallback active after API error",
    timestamp: result._meta.timestamp,
    reason: result._meta.reason,
    errorType: result._meta.errorType,
    status: result._meta.status,
  };
}

function readHistory(): AnalysisHistoryItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as AnalysisHistoryItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.slice(0, MAX_HISTORY_ITEMS);
  } catch {
    return [];
  }
}

function writeHistory(items: AnalysisHistoryItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    HISTORY_STORAGE_KEY,
    JSON.stringify(items.slice(0, MAX_HISTORY_ITEMS)),
  );
}

function ResultPlaceholder() {
  return (
    <div className="space-y-4">
      <SectionCard
        title="Analysis summary"
        description="Results will appear here after a validation run."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="h-28 rounded-2xl border border-dashed border-slate-200 bg-slate-50"
            />
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
            Awaiting draft input
          </p>
          <p className="text-sm leading-6 text-slate-600">
            Submit a clinical draft to view quality score, review readiness, issues,
            and suggested revisions.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Issues"
        description="Detected issues are grouped by quality dimension."
      >
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="h-20 rounded-2xl border border-dashed border-slate-200 bg-slate-50"
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Suggestions"
        description="Recommended revisions will be listed here."
      >
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-12 rounded-xl border border-dashed border-slate-200 bg-slate-50"
            />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <SectionCard title="Analysis summary" description="Generating structured review output.">
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
            />
          ))}
        </div>
        <div className="mt-4 h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
      </SectionCard>

      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm"
        />
      ))}
    </div>
  );
}

export default function Home() {
  const [documentType, setDocumentType] = useState<DocumentType>("Protocol Summary");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);

  useEffect(() => {
    async function loadHealth() {
      try {
        const response = await fetch("/api/health");
        const payload = (await response.json()) as HealthResponse;
        setHealth(payload);
      } catch {
        setHealth({
          hasOpenAIKey: false,
          mode: "mock",
          message: "Unable to load health status; mock mode assumed.",
        });
      }
    }

    void loadHealth();
  }, []);

  useEffect(() => {
    setHistory(readHistory());
  }, []);

  const handleHistorySelect = (item: AnalysisHistoryItem) => {
    setDocumentType(item.documentType);
    setContent(item.content);
    setResult(item.result);
    setDebugInfo(buildDebugInfo(item.result));
    setError("");
  };

  const handleClearHistory = () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Clear recent analyses?");
      if (!confirmed) {
        return;
      }
    }

    writeHistory([]);
    setHistory([]);
  };

  const handleRemoveUploadedFile = () => {
    setUploadState(null);
  };

  const handlePdfUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    console.log("PDF upload detected:", file.name);

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      console.log("PDF extraction failed: unsupported file type");
      setUploadState({
        fileName: file.name,
        error: "Only PDF files are supported.",
      });
      event.target.value = "";
      return;
    }

    setIsExtractingPdf(true);
    setUploadState({
      fileName: file.name,
      message: "Extracting text from PDF...",
    });

    try {
      console.log("PDF extraction started:", file.name);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/extract-pdf", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        text?: string;
        characterCount?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "Unable to extract text from this PDF. Try another file or paste text manually.",
        );
      }

      const extractedText = payload.text?.trim() ?? "";

      if (!extractedText) {
        console.log("PDF extraction failed: no extractable text found");
        setUploadState({
          fileName: file.name,
          error: "The PDF contains little or no extractable text.",
        });
        return;
      }

      console.log("PDF extraction succeeded:", file.name);
      console.log("Extracted character count:", extractedText.length);

      setContent(extractedText);
      setUploadState({
        fileName: file.name,
        message: `Text extracted successfully (${(payload.characterCount ?? extractedText.length).toLocaleString()} characters).`,
      });
      setError("");
    } catch (uploadError) {
      console.log("PDF extraction failed:", uploadError);
      setUploadState({
        fileName: file.name,
        error:
          uploadError instanceof Error
            ? uploadError.message
            : "Unable to extract text from this PDF. Try another file or paste text manually.",
      });
    } finally {
      setIsExtractingPdf(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setError("Enter draft content before running analysis.");
      setResult(null);
      setDebugInfo(null);
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentType,
          content: trimmedContent,
        }),
      });

      const payload = (await response.json()) as AnalysisResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Analysis request failed.");
      }

      setResult(payload);
      setDebugInfo(buildDebugInfo(payload));

      const nextHistoryItem: AnalysisHistoryItem = {
        id: `${payload._meta.timestamp}-${documentType}`,
        createdAt: payload._meta.timestamp,
        documentType,
        content: trimmedContent,
        result: payload,
      };

      setHistory((currentHistory) => {
        const nextHistory = [
          nextHistoryItem,
          ...currentHistory.filter((item) => item.id !== nextHistoryItem.id),
        ].slice(0, MAX_HISTORY_ITEMS);

        writeHistory(nextHistory);
        return nextHistory;
      });
    } catch (submissionError) {
      setResult(null);
      setDebugInfo({
        mode: "mock",
        apiStatus: "Request failed before analysis completed",
        timestamp: new Date().toISOString(),
      });
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Analysis request failed.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const status = getStatusPresentation(health, result);
  const isTextareaEmpty = content.trim().length === 0;
  const resultSuggestion = result ? getUserSuggestion(result._meta) : null;
  const serviceNotice = result ? getServiceNotice(result._meta) : null;

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
                <div className="grid h-5 w-5 grid-cols-2 gap-0.5">
                  <span className="rounded-sm bg-slate-900" />
                  <span className="rounded-sm bg-slate-300" />
                  <span className="rounded-sm bg-slate-300" />
                  <span className="rounded-sm bg-slate-900" />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Internal workflow tool
                </p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                  CliniFlow Lite
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                  AI-assisted pre-review validation for clinical content
                </p>
              </div>
            </div>

            <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                System status
              </p>
              <div className="mt-2 flex items-center justify-between gap-4">
                <StatusBadge tone={status.tone} label={status.label} />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{status.detail}</p>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
          <div className="space-y-4">
            <SectionCard
              title="Analyze draft"
              description="Run a pre-review quality check before sending content into formal clinical review."
            >
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label
                    htmlFor="documentType"
                    className="text-sm font-medium text-slate-700"
                  >
                    Document type
                  </label>
                  <select
                    id="documentType"
                    value={documentType}
                    onChange={(event) =>
                      setDocumentType(event.target.value as DocumentType)
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  >
                    {documentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="pdfUpload" className="text-sm font-medium text-slate-700">
                    PDF upload
                  </label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Upload a PDF to extract text into the draft area
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          Extracted text can be reviewed and edited before analysis.
                        </p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
                        <input
                          id="pdfUpload"
                          type="file"
                          accept=".pdf,application/pdf"
                          className="sr-only"
                          onChange={handlePdfUpload}
                          disabled={isExtractingPdf}
                        />
                        {isExtractingPdf ? "Extracting PDF..." : "Upload PDF"}
                      </label>
                    </div>

                    {uploadState ? (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {uploadState.fileName}
                            </p>
                            {uploadState.message ? (
                              <p className="mt-1 text-sm text-slate-600">
                                {uploadState.message}
                              </p>
                            ) : null}
                            {uploadState.error ? (
                              <p className="mt-1 text-sm text-rose-700">{uploadState.error}</p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveUploadedFile}
                            className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="content" className="text-sm font-medium text-slate-700">
                    Draft content
                  </label>
                  <textarea
                    id="content"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="Paste clinical draft content for a structured pre-review validation pass."
                    className="min-h-[360px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Use this review to catch gaps before internal review cycles begin.</span>
                    <span>{content.length} characters</span>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                {serviceNotice ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {serviceNotice}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="submit"
                    disabled={isLoading || isExtractingPdf || isTextareaEmpty}
                    className="inline-flex min-w-[160px] items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isLoading ? "Analyzing..." : "Analyze"}
                  </button>
                  <p className="text-sm text-slate-500">
                    {result
                      ? `Last run mode: ${result._meta.mode === "live" ? "Live" : "Mock"}`
                      : "Results populate in the panel on the right."}
                  </p>
                </div>
              </form>
            </SectionCard>

            <SectionCard title="System status" description={status.heading}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <StatusBadge tone={status.tone} label={status.label} />
                  <p className="mt-3 text-sm leading-6 text-slate-600">{status.detail}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                    Workflow
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">Pre-review validation</p>
                </div>
              </div>
            </SectionCard>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-4">
              <p className="text-sm font-medium text-slate-900">Usage note</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This interface is designed for quick internal quality screening. It
                supports a lightweight drafting workflow and keeps fallback behavior
                explicit when live AI analysis is unavailable.
              </p>
            </div>

            <SectionCard
              title="Recent analyses"
              description="The latest completed runs are stored locally in this browser for quick recall."
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-slate-600">
                  Select a previous run to reload its analysis output.
                </p>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  disabled={history.length === 0}
                  className="text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  Clear history
                </button>
              </div>

              {history.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleHistorySelect(item)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-white"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {item.documentType}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                            {new Date(item.createdAt).toLocaleString("en-SE", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge
                            tone={item.result._meta.mode === "live" ? "live" : "mock"}
                            label={item.result._meta.mode === "live" ? "Live" : "Mock"}
                          />
                          <StatusBadge
                            tone={item.result.readyForReview ? "live" : "mock"}
                            label={item.result.readyForReview ? "Ready" : "Needs revision"}
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                            Quality score
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {item.result.qualityScore}/100
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                            Review readiness
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {item.result.readyForReview ? "Ready for review" : "Revision recommended"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                            Mode used
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {item.result._meta.mode === "live" ? "Live" : "Mock"}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
                  <p className="text-sm leading-6 text-slate-600">
                    No recent analyses yet. Completed runs will appear here and remain
                    available after refresh on this device.
                  </p>
                </div>
              )}
            </SectionCard>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <LoadingState />
            ) : result ? (
              <>
                <SectionCard
                  title="Analysis summary"
                  description="High-level result for the current draft."
                >
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                          Quality score
                        </p>
                        <div className="mt-3 flex items-end gap-2">
                          <span className="text-5xl font-semibold tracking-tight text-slate-950">
                            {result.qualityScore}
                          </span>
                          <span className="pb-2 text-sm text-slate-500">/ 100</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <StatusBadge
                          tone={result.readyForReview ? "live" : "mock"}
                          label={result.readyForReview ? "Ready for review" : "Needs revision"}
                        />
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                            Mode
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {result._meta.mode === "live" ? "Live analysis" : "Mock analysis"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                      {result.summary}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <KpiCard
                      label="Review readiness"
                      value={
                        <p className="text-lg font-semibold text-slate-900">
                          {result.readyForReview ? "Suitable for formal review" : "Revision recommended"}
                        </p>
                      }
                      supporting={
                        result._meta.mode === "live"
                          ? "Generated using live analysis mode."
                          : "Generated using fallback mock mode."
                      }
                    />
                    <KpiCard
                      label="Content coverage"
                      value={
                        <p className="text-lg font-semibold text-slate-900">
                          {result.missingSections.length === 0
                            ? "Complete"
                            : `${result.missingSections.length} gap${result.missingSections.length === 1 ? "" : "s"} detected`}
                        </p>
                      }
                      supporting="Missing sections are listed below when structural gaps are identified."
                    />
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                        Run mode
                      </span>
                      <StatusBadge
                        tone={
                          result._meta.mode === "live"
                            ? "live"
                            : result._meta.reason === "OPENAI_API_KEY missing"
                              ? "mock"
                              : "error"
                        }
                        label={result._meta.mode === "live" ? "Live" : "Mock"}
                      />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{result.summary}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                          Reason
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {result._meta.reason ?? "Live analysis completed without fallback."}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                          Suggested next step
                        </p>
                        <p className="mt-1 text-sm text-slate-700">{resultSuggestion}</p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                        Missing sections
                      </p>
                      {result.missingSections.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {result.missingSections.map((section) => (
                            <span
                              key={section}
                              className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                            >
                              {section}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-slate-700">
                          No missing sections detected.
                        </p>
                      )}
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Issues"
                  description="Detected issues are grouped by category and severity."
                >
                  {result.issues.length > 0 ? (
                    <div className="space-y-3">
                      {result.issues.map((issue, index) => (
                        <div
                          key={`${issue.category}-${index}`}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {issue.category}
                              </p>
                            </div>
                            <SeverityBadge severity={issue.severity} />
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {issue.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm leading-6 text-slate-600">
                        No material issues were detected in the current draft.
                      </p>
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  title="Suggestions"
                  description="Recommended improvements for the next revision."
                >
                  <ul className="space-y-3">
                    {result.suggestions.map((suggestion) => (
                      <li
                        key={suggestion}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-400" />
                        <span className="text-sm leading-6 text-slate-700">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>

                <SectionCard
                  title="Developer log"
                  description="Latest run diagnostics for demo and troubleshooting purposes."
                >
                  <div className="rounded-2xl border border-slate-200 bg-slate-900 px-4 py-4 text-slate-200">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                          Mode
                        </p>
                        <p className="mt-1 font-mono text-sm">{debugInfo?.mode ?? "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                          API status
                        </p>
                        <p className="mt-1 font-mono text-sm">
                          {debugInfo?.apiStatus ?? "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                          Timestamp
                        </p>
                        <p className="mt-1 font-mono text-sm">
                          {debugInfo?.timestamp ?? "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                          Reason
                        </p>
                        <p className="mt-1 font-mono text-sm">
                          {debugInfo?.reason ?? "None"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                          Error type
                        </p>
                        <p className="mt-1 font-mono text-sm">
                          {debugInfo?.errorType ?? "None"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                          Status code
                        </p>
                        <p className="mt-1 font-mono text-sm">
                          {debugInfo?.status ?? "None"}
                        </p>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </>
            ) : (
              <ResultPlaceholder />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
