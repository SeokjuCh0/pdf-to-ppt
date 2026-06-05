# PDF-to-PPT Vendored OpenDataLoader Skill Context

## Task Statement

Build the GitHub repo `SeokjuCh0/pdf-to-ppt` into a real PDF-to-PPT skill package. The intended result is not a prompt-only workflow and not a thin dependency on an externally installed `opendataloader-pdf` CLI. The implementation should vendor or derive from OpenDataLoader PDF internals so the skill can use its parser/geometry output from repository-owned source and scripts.

## Desired Outcome

- A repo-local Codex/Claude-compatible skill package centered on one `SKILL.md`.
- Vendored OpenDataLoader PDF source or a clearly reproducible source snapshot inside the repo, with license and notice obligations preserved.
- Scripts that build/run the vendored parser path and then convert parser JSON geometry into editable PowerPoint elements.
- Documentation that makes dependency boundaries explicit: Java/Maven may be required to build vendored OpenDataLoader, but users should not need a globally installed `opendataloader-pdf` CLI package.
- Practical PDF-to-PPT guidance for tables, font sizes, geometry normalization, and human-like alignment repair.

## Known Facts And Evidence

- Current repo state: only `SKILL.md` exists on `main`; remote is `https://github.com/SeokjuCh0/pdf-to-ppt.git`.
- User-supplied Downloads files are not readable from this session because macOS permissions return `Operation not permitted`; therefore visual validation against those files is blocked until permissions change.
- Local Java runtime is missing, so Java/Maven build verification cannot run on this machine right now.
- OpenDataLoader PDF source was analyzed from `/tmp/opendataloader-pdf` at commit `9f39686ba7c0e531ea7bceb8545cb5d3e95fc71e`.
- OpenDataLoader license is Apache-2.0. Redistribution of source/derivatives requires carrying the license, preserving attribution notices, marking modifications, and preserving NOTICE when applicable.
- OpenDataLoader `NOTICE` states the product includes OpenDataLoader PDF and points to the GitHub source/licensing info.
- OpenDataLoader third-party notices include veraPDF components under MPL-2.0; packaging a vendored parser artifact needs the upstream `THIRD_PARTY` materials.
- The Python package is a wrapper/carrier for the Java CLI JAR, not a pure Python parser.
- The real parser pipeline is Java:
  - `OpenDataLoaderPDF.processFile` delegates to `DocumentProcessor`.
  - `DocumentProcessor` performs preprocessing, document info extraction, page filtering, structure/native/hybrid processing, sorting, sanitizing, and metadata remapping.
  - Native page processing runs content filtering, hidden text handling, cluster table detection, table border processing, text line/paragraph/heading/list processors, captions, and reading-order logic.
  - Cluster table detection relies on `org.verapdf.wcag.algorithms`, so part of the algorithmic behavior lives in a dependency, not only OpenDataLoader-owned classes.
  - JSON serialization emits object type, id, level, page number, bounding box `[left,bottom,right,top]`, font, font size, color, text content, table rows/cells/spans, and related IDs.
- OpenDataLoader Java core is large: about 107 Java source files and roughly 24k LOC. A faithful internal-source approach is a vendored package, not a tiny prompt.

## Constraints

- Do not claim the skill is dependency-free. A vendored source approach can avoid global OpenDataLoader CLI installation, but still needs Java/Maven at build time and Java at runtime unless a JAR artifact is shipped.
- Preserve Apache-2.0 license, NOTICE, and third-party license material.
- Keep the skill consumable by both Codex and Claude by using a single `SKILL.md` as the instruction surface; any Codex-only automation should be optional.
- Avoid destructive git operations. Preserve unrelated user changes if they appear.
- Keep repo changes reviewable even if vendoring introduces many files.

## Unknowns And Open Questions

- Whether to vendor the full upstream Java/Python tree now, or only the Java modules needed to build the parser JSON path.
- Whether to ship a prebuilt shaded JAR in the skill package. This would improve runtime ergonomics but increases binary weight and requires stricter license/notice handling.
- Exact OpenDataLoader CLI output flags need confirming from source/docs during implementation.
- Exact PPT layout quality cannot be validated against the user's example files until file permissions allow reading those PDFs/PPTX files.
- Final package shape may need separate releases for "source-only" and "prebuilt parser" variants.

## Likely Codebase Touchpoints

- `SKILL.md`: update from lightweight prompt workflow to vendored-parser skill instructions.
- `README.md`: install/use/build guidance for GitHub users.
- `LICENSE`, `NOTICE`, `THIRD_PARTY/`: preserve upstream obligations.
- `vendor/opendataloader-pdf/`: source snapshot or focused vendored parser tree.
- `scripts/`: parser build/run helpers and PPT conversion scripts.
- `tests/` or `fixtures/`: small synthetic geometry tests that do not depend on protected Downloads files.
- `.omx/plans/`: ralplan PRD and test-spec handoff artifacts.
