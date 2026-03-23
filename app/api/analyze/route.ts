import { NextResponse } from "next/server";

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
};

const validDocumentTypes: DocumentType[] = [
  "Protocol Summary",
  "Clinical Study Report Section",
  "Investigator Communication",
  "Regulatory Response Draft",
];

const analysisSchema = {
  name: "clinical_quality_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      qualityScore: {
        type: "number",
        minimum: 0,
        maximum: 100,
      },
      readyForReview: {
        type: "boolean",
      },
      missingSections: {
        type: "array",
        items: {
          type: "string",
        },
      },
      issues: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            category: {
              type: "string",
              enum: [
                "Completeness",
                "Clarity",
                "Consistency",
                "Compliance Risk",
              ],
            },
            severity: {
              type: "string",
              enum: ["Low", "Medium", "High"],
            },
            explanation: {
              type: "string",
            },
          },
          required: ["category", "severity", "explanation"],
        },
      },
      suggestions: {
        type: "array",
        items: {
          type: "string",
        },
      },
      summary: {
        type: "string",
      },
    },
    required: [
      "qualityScore",
      "readyForReview",
      "missingSections",
      "issues",
      "suggestions",
      "summary",
    ],
  },
} as const;

function normalizeText(value: string) {
  return value.toLowerCase();
}

function generateMockAnalysis(
  documentType: DocumentType,
  content: string,
): AnalysisResponse {
  const normalized = normalizeText(content);
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const missingSections: string[] = [];
  const issues: AnalysisIssue[] = [];
  const suggestions: string[] = [];

  const sectionExpectations: Record<DocumentType, string[]> = {
    "Protocol Summary": [
      "objective",
      "study design",
      "population",
      "endpoints",
      "safety",
    ],
    "Clinical Study Report Section": [
      "methods",
      "results",
      "analysis",
      "deviations",
      "conclusion",
    ],
    "Investigator Communication": [
      "purpose",
      "action required",
      "timeline",
      "contact",
    ],
    "Regulatory Response Draft": [
      "question",
      "response",
      "justification",
      "reference",
    ],
  };

  for (const expectedSection of sectionExpectations[documentType]) {
    if (!normalized.includes(expectedSection)) {
      missingSections.push(expectedSection.replace(/\b\w/g, (char) => char.toUpperCase()));
    }
  }

  if (wordCount < 120) {
    issues.push({
      category: "Completeness",
      severity: "High",
      explanation:
        "The draft is brief for the selected document type and may not provide enough context for downstream review.",
    });
    suggestions.push("Expand the draft with more context, rationale, and required supporting detail.");
  }

  if (!/[.;:]/.test(content)) {
    issues.push({
      category: "Clarity",
      severity: "Medium",
      explanation:
        "Sentence boundaries and structure are limited, which may reduce readability for reviewers.",
    });
    suggestions.push("Break dense text into complete sentences and clarify key statements.");
  }

  if (/\bTBD\b|\bto be confirmed\b|\bplaceholder\b/i.test(content)) {
    issues.push({
      category: "Consistency",
      severity: "Medium",
      explanation:
        "Placeholder language suggests unresolved content that could create versioning or alignment issues.",
    });
    suggestions.push("Resolve placeholder text and confirm all referenced values before review.");
  }

  if (!/\bsubject\b|\bpatient\b|\badverse event\b|\bcompliance\b|\bregulatory\b/i.test(content)) {
    issues.push({
      category: "Compliance Risk",
      severity: "Low",
      explanation:
        "The draft has limited explicit regulatory or subject-safety framing, which may be expected in clinical review materials.",
    });
    suggestions.push("Add explicit safety, compliance, or regulatory framing where appropriate.");
  }

  if (missingSections.length > 0) {
    issues.push({
      category: "Completeness",
      severity: missingSections.length >= 3 ? "High" : "Medium",
      explanation: `Expected sections were not clearly identified: ${missingSections.join(", ")}.`,
    });
    suggestions.push("Add clear section headings or explicit coverage for the missing content areas.");
  }

  if (suggestions.length === 0) {
    suggestions.push("Tighten wording and confirm terminology remains consistent throughout the draft.");
    suggestions.push("Perform a final medical, regulatory, and style review before circulation.");
  }

  const baseScore = 92;
  const scorePenalty =
    missingSections.length * 6 +
    issues.reduce((total, issue) => {
      if (issue.severity === "High") return total + 10;
      if (issue.severity === "Medium") return total + 6;
      return total + 3;
    }, 0);

  const qualityScore = Math.max(38, Math.min(98, baseScore - scorePenalty));
  const readyForReview =
    qualityScore >= 75 && missingSections.length <= 1 && !issues.some((issue) => issue.severity === "High");

  return {
    qualityScore,
    readyForReview,
    missingSections,
    issues,
    suggestions: suggestions.slice(0, 4),
    summary: readyForReview
      ? "The draft is broadly structured for review, with a limited number of manageable improvements."
      : "The draft needs targeted revision before formal clinical review to reduce avoidable review cycles.",
  };
}

function isDocumentType(value: string): value is DocumentType {
  return validDocumentTypes.includes(value as DocumentType);
}

function validateAnalysisResponse(value: unknown): value is AnalysisResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AnalysisResponse>;

  return (
    typeof candidate.qualityScore === "number" &&
    typeof candidate.readyForReview === "boolean" &&
    Array.isArray(candidate.missingSections) &&
    candidate.missingSections.every((item) => typeof item === "string") &&
    Array.isArray(candidate.issues) &&
    candidate.issues.every((issue) => {
      if (!issue || typeof issue !== "object") return false;
      const typedIssue = issue as Partial<AnalysisIssue>;
      return (
        ["Completeness", "Clarity", "Consistency", "Compliance Risk"].includes(
          typedIssue.category ?? "",
        ) &&
        ["Low", "Medium", "High"].includes(typedIssue.severity ?? "") &&
        typeof typedIssue.explanation === "string"
      );
    }) &&
    Array.isArray(candidate.suggestions) &&
    candidate.suggestions.every((item) => typeof item === "string") &&
    typeof candidate.summary === "string"
  );
}

async function analyzeWithOpenAI(
  documentType: DocumentType,
  content: string,
): Promise<AnalysisResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const prompt = `Review the clinical content draft and return JSON only.

Document type: ${documentType}

Draft:
${content}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a clinical content quality reviewer. Assess completeness, clarity, consistency, and compliance risk. Return only valid JSON matching the supplied schema.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: analysisSchema,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${errorText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const messageContent = payload.choices?.[0]?.message?.content;
  if (!messageContent) {
    throw new Error("OpenAI response did not include structured content.");
  }

  const parsed = JSON.parse(messageContent) as unknown;
  if (!validateAnalysisResponse(parsed)) {
    throw new Error("OpenAI response did not match the expected analysis shape.");
  }

  return parsed;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      documentType?: string;
      content?: string;
    };

    const documentType = body.documentType?.trim();
    const content = body.content?.trim();

    if (!documentType || !isDocumentType(documentType)) {
      return NextResponse.json(
        { error: "A valid document type is required." },
        { status: 400 },
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: "Content is required for analysis." },
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        ...generateMockAnalysis(documentType, content),
        mode: "mock",
      });
    }

    try {
      const analysis = await analyzeWithOpenAI(documentType, content);
      return NextResponse.json({
        ...analysis,
        mode: "openai",
      });
    } catch {
      return NextResponse.json({
        ...generateMockAnalysis(documentType, content),
        mode: "mock",
      });
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 },
    );
  }
}
