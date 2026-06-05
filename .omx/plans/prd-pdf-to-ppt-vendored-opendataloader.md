# PRD: Vendored OpenDataLoader PDF-to-PPT Skill

## Target Result

Turn `SeokjuCh0/pdf-to-ppt` from a lightweight prompt-only skill into a repository-owned PDF-to-PPT skill package that can extract PDF layout through vendored OpenDataLoader PDF source and reconstruct editable PowerPoint slides from parser JSON geometry.

## Principles

1. Parser geometry is the source of truth; visual prompting is only a fallback or review aid.
2. The skill must not require a globally installed `opendataloader-pdf` CLI package.
3. License and notice obligations are first-class package contents, not afterthoughts.
4. The first implementation should be source-distributable and reviewable before shipping prebuilt binaries.
5. PPT output should prefer editable text/tables/shapes over whole-page rasterization.

## Decision Drivers

1. User wants OpenDataLoader internals copied/used inside the skill, not just referenced.
2. OpenDataLoader's real parser is Java and depends on veraPDF components; the Python package is a wrapper.
3. Skill distribution must work across Codex and Claude via `SKILL.md`.
4. Local machine currently lacks Java and cannot read the protected sample PDF/PPTX files, so verification needs a fallback synthetic path.

## Viable Options

### Option A: Full Source Snapshot With Repo-Owned Wrappers

Vendor upstream source/licensing materials under `vendor/opendataloader-pdf/`, add scripts that build/run the vendored Java parser, and add independent Python PPT reconstruction scripts.

Pros:
- Matches the user's intent most closely.
- Avoids global OpenDataLoader CLI dependency.
- Preserves upstream build system and licensing context.
- Minimizes risk of accidentally breaking parser behavior while extracting a subset too early.

Cons:
- Heavier repository.
- Requires Java/Maven to build.
- Still indirectly uses a parser CLI entry point, but from vendored source rather than an external install.

### Option B: Minimal Java Core Extraction

Copy only the Java packages/classes needed for JSON extraction and create a smaller custom parser runner.

Pros:
- Smaller package.
- Cleaner long-term API surface.

Cons:
- High risk of missing required veraPDF/static container behavior.
- More work to preserve build correctness.
- Harder to verify without Java locally and sample file access.

### Option C: Prompt-Only ChatGPT Pro Workflow

Keep a powerful prompt that asks ChatGPT Pro to infer slide layout from uploaded PDF/screenshots.

Pros:
- Lightest distribution.
- No build dependencies.

Cons:
- Cannot execute OpenDataLoader or access its source.
- Cannot reliably recover table geometry, bounding boxes, or font metrics from prompt alone.
- Does not meet the user's actual goal.

## Decision

Choose Option A now: source-only vendoring of the upstream OpenDataLoader PDF Java project plus repo-owned wrapper/converter scripts. Keep Option B as a later slimming pass after the full vendored path works. Include a ChatGPT Pro prompt only as a companion workflow that consumes already-exported parser JSON or screenshots; it must not claim to run OpenDataLoader.

## Product Scope

Required deliverables:
- `SKILL.md` rewritten around the vendored parser workflow.
- `README.md` with install/build/use instructions and explicit dependency boundaries.
- `LICENSE`, `NOTICE`, and third-party license material carried from OpenDataLoader where source is copied.
- `vendor/opendataloader-pdf/` containing the upstream source snapshot needed to build the parser.
- `vendor/opendataloader-pdf/SOURCE.md` recording upstream repository URL, pinned commit `9f39686ba7c0e531ea7bceb8545cb5d3e95fc71e`, snapshot date, license summary, and local modification policy.
- `scripts/build_parser.sh` to build the vendored parser artifact.
- `scripts/extract_pdf_json.py` to run the repo-built parser artifact and write JSON output.
- `scripts/json_to_pptx.py` to convert OpenDataLoader-style JSON geometry into an editable PPTX.
- `scripts/pdf_to_pptx.py` as a convenience pipeline wrapper.
- `prompts/chatgpt-pro.md` explaining the prompt-only limitations and how to use exported JSON.
- Lightweight tests or fixture-driven validation for geometry conversion and PPTX creation.

Out of scope for this first pass:
- Shipping a prebuilt JAR binary.
- Perfect reconstruction of charts/images from arbitrary PDFs.
- OCR/scanned PDF support beyond documenting fallback behavior.
- Validation against the user's protected Downloads files while macOS permissions block reads.

## Acceptance Criteria

- The repository no longer suggests that a global `opendataloader-pdf` CLI install is the primary path.
- OpenDataLoader source and required notice/license materials are present in the repo under clear paths.
- The vendored source has explicit provenance: upstream URL, commit `9f39686ba7c0e531ea7bceb8545cb5d3e95fc71e`, source snapshot date, Apache-2.0 license, NOTICE, and third-party license materials.
- Any local modifications to vendored upstream files are either avoided or clearly marked in `SOURCE.md` and file headers/patch notes.
- The parser build/run scripts resolve only repo-local vendored artifacts after build and do not fall back to `opendataloader-pdf` on `PATH`.
- The PPT converter can create an editable `.pptx` from a small OpenDataLoader-like JSON fixture without Java.
- Font size and text box behavior are handled explicitly: subset-prefix stripping, CJK fallbacks, tight margins, and bounded shrink-to-fit.
- Table reconstruction uses cell bounding boxes/spans when available instead of equal-width guesses.
- README and SKILL.md state that ChatGPT Pro prompt-only usage cannot run OpenDataLoader; it needs exported JSON or visual uploads.
- Verification report honestly states Java/sample-file gaps if they remain.

## Available Agent Types Roster

- `architect`: review package boundary, licensing risk, and vendoring strategy.
- `critic`: evaluate plan consistency, risk mitigation, and acceptance criteria.
- `executor`: implement vendoring, scripts, and documentation.
- `test-engineer`: add/verify fixture-driven converter tests.
- `writer`: tighten skill/README/prompt language.
- `verifier`: check final repo state, scripts, tests, and git diff.

## Team Staffing Guidance

Recommended `$team` launch: `omx team 4:executor "<approved task>"`

Worker lanes:
- Lane 1, vendoring/build: copy OpenDataLoader source/licensing material and add `scripts/build_parser.sh`.
- Lane 2, parser/converter scripts: add extraction/pipeline wrappers and JSON-to-PPTX conversion.
- Lane 3, docs/skill/prompt: rewrite `SKILL.md`, add README and ChatGPT Pro companion prompt.
- Lane 4, tests/verification: create fixtures/tests and run available validation.

Suggested reasoning:
- Vendoring/build: high attention to paths and licensing.
- Converter: medium/high attention to coordinate and typography behavior.
- Docs: medium attention, strict wording around limitations.
- Verification: high attention to claims vs evidence.

## ADR

Decision: Vendor a pinned OpenDataLoader PDF source snapshot and licensing material, then build/run a repo-local parser artifact through wrapper scripts.

Drivers: user intent, parser complexity, licensing duties, cross-agent skill compatibility, and current inability to verify Java/sample-file behavior locally.

Alternatives considered: minimal Java extraction, external CLI dependency, prompt-only workflow, prebuilt binary distribution.

Why chosen: full source vendoring is the safest way to satisfy internal-source ownership without prematurely reimplementing or trimming a 24k LOC Java parser.

Consequences: repo becomes heavier and still has Java/Maven build requirements; later optimization can trim the vendored tree or add release artifacts. The wrapper may execute OpenDataLoader's CLI main class from the repo-built artifact, but must not depend on a globally installed OpenDataLoader CLI package.

Follow-ups: add Java build CI, add real sample fixtures once permissions allow, evaluate a smaller custom Java runner after the source snapshot path is proven.

## Goal-Mode Follow-Up Suggestions

- `$ultragoal`: useful later for a durable multi-stage roadmap such as source slimming, binary release, CI, and visual regression.
- `$performance-goal`: useful only if conversion speed or parser build time becomes the primary concern.
- `$autoresearch-goal`: useful only if the next task becomes comparative research on PDF parser alternatives.
