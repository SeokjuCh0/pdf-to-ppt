---
name: pdf-to-ppt
description: Convert PDF reports, tables, dashboards, and presentation-like pages into editable PowerPoint files using OpenDataLoader PDF JSON geometry. Use when making or repairing PDF-to-PPTX conversions, preserving table alignment, diagnosing layout drift, or turning parser bounding boxes into editable PowerPoint elements instead of relying only on visual prompting.
---

# PDF to PPT

## Instructions

Use this skill to convert PDFs into editable PowerPoint files with layout fidelity.

Prefer deterministic parser geometry over prompt-only visual reconstruction. The core idea is:

1. Extract structured layout from the PDF with OpenDataLoader PDF.
2. Use the parser's bounding boxes as the source of truth.
3. Rebuild the slide with editable PowerPoint objects.
4. Verify geometry first, then typography.

## Extraction

Use OpenDataLoader PDF JSON output when possible:

```bash
opendataloader-pdf "input.pdf" \
  --format json \
  --table-method cluster \
  --reading-order xycut \
  --image-output external \
  --output-dir "out"
```

Use `--table-method cluster` for borderless, lightly ruled, or report-style tables.

Use hybrid/OCR only when the PDF is scanned or the normal JSON output has clearly wrong table structure.

## Coordinate Mapping

OpenDataLoader bounding boxes are:

```text
[left, bottom, right, top]
```

They are PDF points with a bottom-left origin.

PowerPoint uses a top-left origin. Convert with:

```text
x = left
y = page_height - top
width = right - left
height = top - bottom
```

Use the source PDF page size as the slide size unless the user explicitly asks for 16:9 or another presentation format.

## Editable Reconstruction

Keep output editable whenever practical:

- Use text boxes for paragraphs, headings, captions, and labels.
- Use real PowerPoint tables for table elements.
- Use image shapes only for actual image/chart elements or optional visual background references.
- Avoid rasterizing the whole PDF page unless the user prioritizes visual fidelity over editability.

## Typography Rules

Preserve typography as a controlled approximation, not as a pixel-perfect promise.

- Strip PDF subset prefixes from font names, such as `ABCDEE+Pretendard-Regular` to `Pretendard-Regular`.
- Use the parser's `font size` as the starting PowerPoint point size. If the page is scaled, use `ppt_font_size = pdf_font_size * scale`.
- Preserve bold/weight when the font name contains signals such as `Bold`, `SemiBold`, `Medium`, or `Black`.
- Preserve text color when the parser provides it.
- For Korean text, prefer the source font when installed. If unavailable, use a CJK-capable fallback such as `Pretendard`, `Noto Sans CJK KR`, `Apple SD Gothic Neo`, or `Malgun Gothic`.
- Do not use PowerPoint auto-fit as the first fix. First set the correct box size, margins, line breaks, and font size. Use shrink-to-fit only for small overflow.
- Use tight text margins for tables and report labels. Default PowerPoint text margins often make cells look misaligned.
- Align numeric table cells right or center when the source layout clearly does so.
- When exact font rendering matters more than editability, add a raster PDF page image as a temporary visual reference and place editable text/tables over it.

## Table Rules

For tables, do not divide columns equally unless cell geometry is missing.

Use:

- `table.rows[].cells[].bounding box` for row heights and column widths
- `row span` and `column span` for merged cells
- nested `kids[].content` for cell text

If the generated PPT table is misaligned:

1. Check whether JSON cell boxes are correct.
2. If JSON is correct, fix the PowerPoint coordinate mapping.
3. If JSON is wrong, rerun OpenDataLoader with different parser settings before hand-tuning PPT layout.

## Quality Check

Verify in this order:

1. Page size and coordinate origin
2. Major section boxes and table boundaries
3. Row and column alignment
4. Text overflow and font sizing
5. Final visual comparison against the source PDF or previous PPTX

Do not preserve drift from an existing bad PPTX. Use it only as a comparison artifact.
