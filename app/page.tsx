"use client";

import { FormEvent, useState } from "react";

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
  mode?: "mock" | "openai";
};

const documentTypes: DocumentType[] = [
  "Protocol Summary",
  "Clinical Study Report Section",
  "Investigator Communication",
  "Regulatory Response Draft",
];

const severityStyles: Record<AnalysisIssue["severity"], string> = {
  Low: "bg-slate-100 text-slate-700",
  Medium: "bg-amber-100 text-amber-800",
  High: "bg-rose-100 text-rose-800",
};

function ResultCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-panel">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </h2>
      <div className="mt-4 text-sm text-slate-700">{children}</div>
    </section>
  );
}

export default function Home() {
  const [documentType, setDocumentType] = useState<DocumentType>("Protocol Summary");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setError("Enter draft content before running analysis.");
      setResult(null);
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
    } catch (submissionError) {
      setResult(null);
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Analysis request failed.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-panel sm:p-10">
            <div className="max-w-2xl">
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-600">
                Clinical content QA prototype
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900">
                CliniFlow Lite
              </h1>
              <p className="mt-3 text-base text-slate-600">
                AI-assisted pre-review validation for clinical content
              </p>
            </div>

            <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                >
                  {documentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="content" className="text-sm font-medium text-slate-700">
                  Draft content
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Paste or draft clinical content here for pre-review validation."
                  className="min-h-[320px] w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Run a quick completeness and quality pass before formal review.
                  </span>
                  <span>{content.length} characters</span>
                </div>
              </div>

              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex min-w-[148px] items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isLoading ? "Analyzing..." : "Analyze"}
                </button>
                <span className="text-sm text-slate-500">
                  {result?.mode === "mock"
                    ? "Mock analysis mode"
                    : result?.mode === "openai"
                      ? "OpenAI analysis mode"
                      : "Results appear below"}
                </span>
              </div>
            </form>
          </section>

          <aside className="space-y-4 rounded-3xl border border-slate-200 bg-slate-900 p-8 text-slate-50 shadow-panel">
            <h2 className="text-lg font-semibold">How it works</h2>
            <p className="text-sm leading-6 text-slate-300">
              CliniFlow Lite provides a lightweight pre-review screen for common
              clinical drafting workflows. It checks for missing content, highlights
              issues, and returns practical revision guidance in a structured format.
            </p>
            <div className="grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  Review focus
                </p>
                <p className="mt-2 text-sm text-slate-100">
                  Completeness, clarity, internal consistency, and compliance risk.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  Demo behavior
                </p>
                <p className="mt-2 text-sm text-slate-100">
                  If no API key is configured, the backend returns a deterministic mock
                  result so the prototype remains usable.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-8">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-panel"
                />
              ))}
            </div>
          ) : result ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ResultCard title="Quality score">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-semibold text-slate-900">
                    {result.qualityScore}
                  </span>
                  <span className="pb-1 text-sm text-slate-500">/ 100</span>
                </div>
                <p className="mt-4 leading-6 text-slate-600">{result.summary}</p>
              </ResultCard>

              <ResultCard title="Ready for review">
                <div
                  className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                    result.readyForReview
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {result.readyForReview ? "Yes" : "Not yet"}
                </div>
                <p className="mt-4 leading-6 text-slate-600">
                  {result.readyForReview
                    ? "The draft appears suitable for formal review with routine edits."
                    : "Address the flagged gaps before sending this draft to formal review."}
                </p>
              </ResultCard>

              <ResultCard title="Missing sections">
                {result.missingSections.length > 0 ? (
                  <ul className="space-y-3">
                    {result.missingSections.map((section) => (
                      <li
                        key={section}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        {section}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="leading-6 text-slate-600">
                    No clearly missing sections were detected.
                  </p>
                )}
              </ResultCard>

              <ResultCard title="Issues detected">
                {result.issues.length > 0 ? (
                  <div className="space-y-3">
                    {result.issues.map((issue, index) => (
                      <div
                        key={`${issue.category}-${index}`}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-slate-900">{issue.category}</p>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${severityStyles[issue.severity]}`}
                          >
                            {issue.severity}
                          </span>
                        </div>
                        <p className="mt-3 leading-6 text-slate-600">
                          {issue.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="leading-6 text-slate-600">
                    No significant issues were detected.
                  </p>
                )}
              </ResultCard>

              <ResultCard title="Suggestions">
                <ul className="space-y-3">
                  {result.suggestions.map((suggestion) => (
                    <li
                      key={suggestion}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 leading-6"
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </ResultCard>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-center shadow-panel">
              <h2 className="text-lg font-semibold text-slate-900">
                Structured analysis results
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Submit a draft to view score, review readiness, missing sections,
                detected issues, and suggested next steps.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
