# Test Spec: Vendored OpenDataLoader PDF-to-PPT Skill

## Claim To Prove

The repository can use vendored OpenDataLoader PDF source as the parser path and can generate an editable PowerPoint from OpenDataLoader-style JSON geometry without relying on prompt-only reconstruction.

## Verification Layers

### Static Repository Checks

- `SKILL.md` describes the vendored parser workflow and no longer presents global `opendataloader-pdf` CLI installation as the primary path.
- `README.md` documents prerequisites, build steps, conversion steps, and prompt-only limitations.
- `LICENSE`, `NOTICE`, and third-party license materials are present when OpenDataLoader source is vendored.
- `vendor/opendataloader-pdf/` contains upstream source sufficient to build the parser, including Java module POMs.
- `vendor/opendataloader-pdf/SOURCE.md` records upstream URL, commit `9f39686ba7c0e531ea7bceb8545cb5d3e95fc71e`, snapshot date, license/notice policy, and whether any local modifications were made.
- Build/run scripts reference repo-local vendored paths and never invoke `opendataloader-pdf` from `PATH`.

### Script Checks

- `scripts/build_parser.sh --help` or source inspection shows it builds from `vendor/opendataloader-pdf/java`.
- `scripts/extract_pdf_json.py --help` succeeds.
- `scripts/json_to_pptx.py --help` succeeds.
- `scripts/pdf_to_pptx.py --help` succeeds.
- Scripts fail clearly when Java/Maven or the parser JAR is missing.
- `scripts/extract_pdf_json.py` resolves a repo-built JAR or explicit `--jar` path only; it has no global CLI fallback.

### Geometry Unit/Fixture Checks

Use a small OpenDataLoader-like JSON fixture with:
- page size,
- text block with bounding box `[left,bottom,right,top]`,
- font name with subset prefix,
- font size and color,
- table with two columns, two rows, and cell bounding boxes.

Expected behavior:
- PDF bottom-left coordinates convert to PowerPoint top-left coordinates.
- Slide size follows source page size.
- Text boxes are editable and placed at expected coordinates.
- Table cells are reconstructed from bounding boxes rather than equal-width guesses.
- Font subset prefix is stripped.
- Korean/CJK fallback font logic is present.

### Packaging Checks

- `python -m py_compile scripts/*.py` succeeds.
- Fixture conversion writes a `.pptx` file.
- Generated `.pptx` opens structurally through `python-pptx` and contains expected slide/shape count.

### Java Build Checks

Run if Java/Maven are available:

```bash
scripts/build_parser.sh
```

Expected:
- Maven builds the vendored parser artifact from repo source.
- No global `opendataloader-pdf` package is invoked.
- Build output is discovered from the vendored Maven target directory or copied into a repo-local artifact path.

Known current gap:
- This local machine currently reports no Java runtime, so Java build verification may remain not-tested unless Java is installed.

### Real Sample Checks

Run only when macOS permissions allow reading the user's sample files:

```bash
scripts/pdf_to_pptx.py "/Users/sj/Downloads/예시파일_-_(요약)_2025_한국_부자_보고서.pdf" /tmp/korea_wealth_report.pptx
```

Expected:
- Parser JSON is produced.
- PPTX is created.
- Manual visual review checks major table/row/column alignment against the source.

Known current gap:
- The protected Downloads files currently return `Operation not permitted` from this session.

## Team Verification Path

1. Run static repository checks.
2. Run Python help/compile checks.
3. Run fixture conversion and inspect generated PPTX through `python-pptx`.
4. Attempt Java build and record exact outcome.
5. Attempt real sample conversion only if file permissions permit.
6. Verify git diff contains no unrelated cleanup or destructive changes.

## Stop Condition

Stop when the repository contains the vendored source path, scripts, docs, fixture test path, and all available checks either pass or have explicit environment-blocked evidence.
