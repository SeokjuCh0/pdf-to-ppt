---
name: pdf-to-ppt
description: Convert PDF reports, tables, dashboards, and presentation-like pages into editable PowerPoint files using a repo-vendored OpenDataLoader PDF parser snapshot and JSON geometry. Use when making or repairing PDF-to-PPTX conversions, preserving table alignment, diagnosing layout drift, or turning parser bounding boxes into editable PowerPoint elements instead of relying only on visual prompting.
---

# PDF to PPT

## What This Skill Does

Use this skill to convert a PDF into an editable PowerPoint deck with parser
geometry as the source of truth.

This repository vendors OpenDataLoader PDF Java parser source under
`vendor/opendataloader-pdf/`. Do not require a globally installed
`opendataloader-pdf` CLI package. Build the repo-local parser artifact from the
vendored source, then run the wrapper scripts in `scripts/`.

Prompt-only use is a fallback. ChatGPT Pro cannot execute the vendored parser by
itself; it can only reason over uploaded screenshots/PDF pages or already
exported JSON.

## Parser Build

Build the vendored parser when Java 11+ and Maven are available:

```bash
scripts/build_parser.sh --skip-tests
```

On macOS with Homebrew OpenJDK, prefer:

```bash
PATH=/opt/homebrew/opt/openjdk/bin:$PATH scripts/build_parser.sh --skip-tests
```

The script builds from `vendor/opendataloader-pdf/java` and copies the parser
JAR to `build/opendataloader/opendataloader-pdf-cli.jar`.

If Java or Maven is missing, say so explicitly and continue only with JSON
fixtures or already exported parser JSON.

## End-To-End Conversion

```bash
scripts/pdf_to_pptx.py input.pdf output.pptx \
  --table-method cluster \
  --reading-order xycut \
  --image-output external
```

Use `--page-width` and `--page-height` when exact source page dimensions are
known. OpenDataLoader JSON always contains element bounding boxes, but it may not
include page size metadata.

## JSON-To-PPTX Only

Use this when JSON was already exported:

```bash
scripts/json_to_pptx.py layout.json output.pptx --page-width 595 --page-height 842
```

## Coordinate Rules

OpenDataLoader bounding boxes are:

```text
[left, bottom, right, top]
```

They are PDF points with a bottom-left origin. PowerPoint uses a top-left origin:

```text
x = left
y = page_height - top
width = right - left
height = top - bottom
```

Use source page size as the slide size when known. If it is not known, infer from
JSON metadata or bounding boxes and flag that the result may need page-size
adjustment.

## Editable Reconstruction Rules

- Use editable text boxes for headings, paragraphs, captions, and labels.
- Use PowerPoint table shapes for table elements.
- Use cell bounding boxes to infer row heights and column widths.
- Use image shapes only for actual image/chart elements when the parser exported
  image files.
- Do not rasterize the entire PDF page unless visual fidelity is explicitly more
  important than editability.

## Typography Rules

Preserve typography as a controlled approximation.

- Strip PDF subset prefixes such as `ABCDEF+Pretendard-Regular`.
- Start from parser `font size`; scale it only when slide/page scaling is applied.
- Preserve obvious weight from font names such as `Bold`, `SemiBold`, `Medium`,
  and `Black`.
- Preserve text color when parser JSON provides it.
- For Korean text, prefer the source font when available; otherwise use a CJK
  fallback such as `Pretendard`, `Noto Sans CJK KR`, `Apple SD Gothic Neo`, or
  `Malgun Gothic`.
- Set tight text margins for table cells and report labels.
- Do not use shrink-to-fit as the first fix; correct geometry, margins, line
  breaks, and font size first.

## Table Repair Order

When a generated table is misaligned:

1. Check JSON cell bounding boxes.
2. If JSON boxes are correct, fix PPT coordinate/page-size mapping.
3. If JSON boxes are wrong, rerun the parser with `--table-method cluster`,
   page filtering, or different OpenDataLoader settings.
4. Only hand-tune PPT table widths after parser and coordinate issues are ruled
   out.

## Verification

Run available checks before claiming completion:

```bash
python -m py_compile scripts/*.py
python -m unittest discover -s tests
```

If Java is installed, also run:

```bash
scripts/build_parser.sh --skip-tests
```

For protected local PDFs, report macOS permission errors directly instead of
guessing from inaccessible files. If Java cannot read a file under Downloads,
Desktop, or Documents, move the PDF to a readable workspace path or grant the
terminal/Java process file access.
