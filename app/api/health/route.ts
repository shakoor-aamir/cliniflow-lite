import { NextResponse } from "next/server";

export async function GET() {
  const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);

  return NextResponse.json({
    hasOpenAIKey,
    mode: hasOpenAIKey ? "live" : "mock",
    message: hasOpenAIKey
      ? "live (key detected)"
      : "OPENAI_API_KEY missing; mock mode active",
  });
}
