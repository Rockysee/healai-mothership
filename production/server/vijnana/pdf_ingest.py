#!/usr/bin/env python3
"""
Vijnana — PDF Ingestion Pipeline
Reads ICSE PDF files (board papers, syllabi, specimen papers) and
outputs structured JSON for the question bank.

Usage:
  python3 pdf_ingest.py --file /path/to/Biology_Board_Paper_2025.pdf \
                         --subject biology \
                         --year 2025 \
                         --type board_paper \
                         --api-key sk-ant-...

Output: JSON to stdout
"""

import argparse
import json
import os
import sys
import base64
import urllib.request
import urllib.error

try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False


def extract_text_pdfplumber(file_path: str) -> str:
    """Extract all text from a PDF using pdfplumber."""
    pages = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text.strip())
    return "\n\n".join(pages)


def extract_text_fallback(file_path: str) -> str:
    """Fallback: return base64 for Claude vision (used if pdfplumber unavailable)."""
    with open(file_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def call_claude(text_content: str, subject: str, year: int, doc_type: str, api_key: str, is_base64: bool = False) -> dict:
    """Send extracted text to Claude for structured question bank generation."""

    if doc_type == "board_paper":
        prompt = f"""You are an ICSE exam expert. Extract ALL questions from this {year} ICSE {subject.title()} board paper.

PDF TEXT:
{text_content[:12000]}

Output ONLY this JSON (no preamble, no explanation):
{{
  "year": {year},
  "subject": "{subject}",
  "type": "board_paper",
  "questions": [
    {{
      "q_no": "1a",
      "text": "full question text here",
      "marks": 2,
      "topic": "Cell Division",
      "chapter_id": "10-bio-1",
      "section": "Section A",
      "has_diagram": false,
      "has_code": false
    }}
  ]
}}

Rules:
- Capture every question including sub-questions (1a, 1b, 2a, etc.)
- For marks: extract from the paper (usually shown in brackets like [2])
- For topic: map to the most relevant ICSE chapter topic
- For chapter_id: use format "class-subject-number" e.g. "10-bio-1"
- has_diagram: true if question references a diagram to draw/label
- has_code: true for Computer Applications programming questions"""

    elif doc_type == "syllabus":
        prompt = f"""You are an ICSE curriculum expert. Extract the structured topic list from this {subject.title()} syllabus PDF.

PDF TEXT:
{text_content[:8000]}

Output ONLY this JSON:
{{
  "subject": "{subject}",
  "type": "syllabus",
  "classes": {{
    "10": {{
      "units": [
        {{
          "unit_no": 1,
          "title": "Unit title",
          "topics": ["topic 1", "topic 2"],
          "weightage_marks": 15
        }}
      ]
    }}
  }}
}}"""

    elif doc_type == "specimen_paper":
        prompt = f"""You are an ICSE exam expert. Extract questions from this ICSE {subject.title()} specimen paper.

PDF TEXT:
{text_content[:10000]}

Output ONLY this JSON (same format as board_paper but type="specimen_paper"):
{{
  "year": {year},
  "subject": "{subject}",
  "type": "specimen_paper",
  "questions": [
    {{
      "q_no": "1",
      "text": "question text",
      "marks": 2,
      "topic": "topic name",
      "chapter_id": "",
      "section": "Section A",
      "has_diagram": false,
      "has_code": false
    }}
  ]
}}"""
    else:
        prompt = f"Extract structured educational content from this PDF and return as JSON. PDF TEXT:\n{text_content[:8000]}"

    body = json.dumps({
        "model": "claude-haiku-4-5",
        "max_tokens": 4000,
        "messages": [{"role": "user", "content": prompt}]
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            raw = data["content"][0]["text"]
            # Extract JSON from response
            start = raw.find("{")
            end   = raw.rfind("}") + 1
            if start == -1 or end == 0:
                raise ValueError("No JSON found in Claude response")
            return json.loads(raw[start:end])
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Claude API HTTP {e.code}: {e.read().decode()}")


def main():
    parser = argparse.ArgumentParser(description="Vijnana PDF Ingestion Pipeline")
    parser.add_argument("--file",    required=True, help="Path to the PDF file")
    parser.add_argument("--subject", required=True, help="Subject name (biology, maths, etc.)")
    parser.add_argument("--year",    type=int, default=2025, help="Year (for board papers)")
    parser.add_argument("--type",    default="board_paper",
                        choices=["board_paper", "syllabus", "specimen_paper"],
                        help="Document type")
    parser.add_argument("--api-key", default=os.environ.get("ANTHROPIC_API_KEY", ""),
                        help="Anthropic API key")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(json.dumps({"error": f"File not found: {args.file}"}))
        sys.exit(1)

    if not args.api_key:
        print(json.dumps({"error": "ANTHROPIC_API_KEY required (--api-key or env var)"}))
        sys.exit(1)

    # Extract text
    is_base64 = False
    if PDFPLUMBER_AVAILABLE:
        try:
            text = extract_text_pdfplumber(args.file)
        except Exception as e:
            text = extract_text_fallback(args.file)
            is_base64 = True
    else:
        text = extract_text_fallback(args.file)
        is_base64 = True

    if not text.strip():
        print(json.dumps({"error": "Could not extract text from PDF — file may be scanned image"}))
        sys.exit(1)

    # Call Claude for structuring
    result = call_claude(text, args.subject, args.year, args.type, args.api_key, is_base64)
    result["_meta"] = {
        "source_file": os.path.basename(args.file),
        "extracted_chars": len(text),
        "pdfplumber_used": PDFPLUMBER_AVAILABLE and not is_base64,
    }

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
