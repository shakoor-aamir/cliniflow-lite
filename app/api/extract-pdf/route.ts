import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const timestamp = new Date().toISOString();

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      console.log("PDF upload detected:", "missing file", timestamp);
      return NextResponse.json(
        { error: "A PDF file is required." },
        { status: 400 },
      );
    }

    console.log("PDF upload detected:", file.name, timestamp);

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      console.log("PDF extraction failed:", "unsupported file type", timestamp);
      return NextResponse.json(
        { error: "Only PDF files are supported." },
        { status: 400 },
      );
    }

    console.log("PDF extraction started:", file.name);

    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    const parsed = await pdfParse(pdfBuffer);
    const text = parsed.text.replace(/\s+\n/g, "\n").trim();

    if (!text) {
      console.log("PDF extraction failed:", "no extractable text found", timestamp);
      return NextResponse.json(
        { error: "The PDF contains little or no extractable text." },
        { status: 422 },
      );
    }

    console.log("PDF extraction succeeded:", file.name);
    console.log("Extracted character count:", text.length);

    return NextResponse.json({
      text,
      characterCount: text.length,
      fileName: file.name,
    });
  } catch (error) {
    console.log("PDF extraction failed:", error, timestamp);

    return NextResponse.json(
      {
        error:
          "Unable to extract text from this PDF. Try another file or paste text manually.",
      },
      { status: 500 },
    );
  }
}
