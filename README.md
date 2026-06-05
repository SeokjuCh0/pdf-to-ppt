# PDF to PPT Skill

This repository is a Codex/Claude-compatible skill package for converting PDF
reports into editable PowerPoint files.

The important design choice: this is not a thin wrapper around a globally
installed `opendataloader-pdf` CLI. It vendors a pinned OpenDataLoader PDF Java
parser source snapshot under `vendor/opendataloader-pdf/` and provides
repo-owned scripts for building/running that parser and converting JSON geometry
into PPTX.

## Contents

- `SKILL.md` - portable skill instructions for Codex and Claude.
- `vendor/opendataloader-pdf/` - partial OpenDataLoader PDF Java parser source snapshot.
- `vendor/opendataloader-pdf/SOURCE.md` - upstream provenance and modification policy.
- `scripts/build_parser.sh` - builds the vendored parser JAR.
- `scripts/extract_pdf_json.py` - runs the repo-built parser JAR.
- `scripts/json_to_pptx.py` - converts parser JSON to editable PPTX.
- `scripts/pdf_to_pptx.py` - end-to-end PDF to PPTX pipeline.
- `tests/` - fixture-driven checks for geometry conversion.
- `prompts/chatgpt-pro.md` - prompt-only companion workflow and limitations.

## Requirements

For JSON-to-PPTX conversion:

- Python 3.10+
- `python-pptx`

For PDF parsing from vendored source:

- Java 11+
- Maven

No global `opendataloader-pdf` CLI package is required or used by the scripts.

## Build The Parser

```bash
scripts/build_parser.sh --skip-tests
```

If Java was installed through Homebrew on macOS and `/usr/bin/java` still cannot
find it, run:

```bash
PATH=/opt/homebrew/opt/openjdk/bin:$PATH scripts/build_parser.sh --skip-tests
```

This builds from:

```text
vendor/opendataloader-pdf/java
```

and writes:

```text
build/opendataloader/opendataloader-pdf-cli.jar
```

## Convert A PDF

```bash
scripts/pdf_to_pptx.py input.pdf output.pptx \
  --java /opt/homebrew/opt/openjdk/bin/java \
  --table-method cluster \
  --reading-order xycut \
  --image-output external
```

The app-facing CLI exposes the same engine with machine-readable JSON output:

```bash
python3 -m pdfppt_core inspect input.pdf
python3 -m pdfppt_core convert input.pdf output.pptx --json-output output.json
python3 -m pdfppt_core verify output.pptx --json output.json
```

For visually complex slides, use a vision model to produce a native component
spec and render it without adding a local OCR/vision dependency:

```bash
python3 -m pdfppt_core visual-spec visual-spec.json output.pptx
```

Use `prompts/visual-spec-chatgpt-pro.md` to ask ChatGPT Pro for that JSON. In
this workflow OpenDataLoader is only supporting evidence for text and bounding
boxes; the screenshot or PDF image is the visual source of truth.

If the source PDF page size is known, pass it in PDF points:

```bash
scripts/pdf_to_pptx.py input.pdf output.pptx --page-width 595 --page-height 842
```

## Desktop App

This repo includes a lightweight Tauri desktop shell under `apps/desktop`.
It is designed for macOS and Windows without a local web server in packaged
builds. The UI is vanilla Vite; the native layer runs the local converter CLI.

Development run:

```bash
cd apps/desktop
npm install
npm run tauri -- dev
```

The production direction is to bundle a platform-specific `pdfppt-core` sidecar
binary plus the parser JAR so end users do not need to install Python, Java, or
Node.js manually.

## Convert Existing JSON

```bash
scripts/json_to_pptx.py layout.json output.pptx --page-width 595 --page-height 842
```

OpenDataLoader JSON boxes are `[left, bottom, right, top]` in PDF points. The
converter flips them into PowerPoint's top-left coordinate system.

## ChatGPT Pro Prompt-Only Use

ChatGPT Pro cannot execute this vendored OpenDataLoader parser from a prompt.
Use `prompts/chatgpt-pro.md` only for:

- explaining the workflow,
- reviewing uploaded parser JSON,
- comparing a source PDF screenshot to a generated PPTX,
- drafting repair instructions.

If parser JSON is needed, run the local scripts first and upload the JSON.

For visual reconstruction, use `prompts/visual-spec-chatgpt-pro.md` instead.
It asks ChatGPT Pro to output a JSON component spec that this repo renders into
native PowerPoint text boxes and shapes.

## License And Attribution

The vendored OpenDataLoader PDF Java parser source is Apache-2.0. Its upstream
`LICENSE`, `NOTICE`, and `THIRD_PARTY` materials are preserved in this repo.
Third-party components listed by upstream retain their own license terms.

This README is implementation guidance, not legal advice.

## Verification

```bash
python -m py_compile scripts/*.py
python -m unittest discover -s tests
```

If Java/Maven are available:

```bash
scripts/build_parser.sh --skip-tests
```

Current known environment limitations from the original build session:

- Java/Maven may need to be installed before building the vendored parser.
- macOS privacy controls can block Java from reading files under
  `/Users/*/Downloads`, Desktop, or Documents. Move the PDF to a readable
  workspace path or grant the terminal/Java process file access.
