# cliniflow-lite

A lightweight SaaS prototype for AI-assisted clinical content quality validation.

## Purpose
This project was built to validate a product hypothesis:
Can AI-assisted pre-review checks improve content quality and reduce reviewer rework in clinical workflows?

## Features
- Document type selection
- PDF upload with text extraction into the draft editor
- Content analysis using AI (or mock fallback)
- Quality scoring
- Missing sections detection
- Issue classification
- Suggestions for improvement

## Tech Stack
- Next.js
- TypeScript
- Tailwind CSS
- OpenAI API (with fallback mode)
- `pdf-parse` for lightweight server-side PDF text extraction

## Notes
- Includes mock fallback to ensure stable demo without API dependency
- Focused on product validation, not full system implementation

## Environment Setup
1. Create `.env.local` in the project root.
2. Add:

```bash
OPENAI_API_KEY=your_key_here
```

3. Restart the dev server:

```bash
npm run dev
```

If the key is missing, the app runs in mock mode automatically. Live mode activates automatically when `OPENAI_API_KEY` is present.

## PDF Upload
Users can upload a `.pdf` file directly in the draft input panel. The app extracts text through a lightweight server-side route using `pdf-parse` and places it into the draft textarea for review and editing before analysis.
