# OpenDataLoader PDF Source Snapshot

This directory contains a partial source snapshot of OpenDataLoader PDF for use
by the `pdf-to-ppt` skill.

## Upstream

- Repository: https://github.com/opendataloader-project/opendataloader-pdf
- Snapshot commit: `9f39686ba7c0e531ea7bceb8545cb5d3e95fc71e`
- Snapshot date: 2026-06-05 UTC
- Snapshot method: copied from a local clone at `/tmp/opendataloader-pdf`

## Included Scope

The vendored scope is intentionally limited to the parser implementation needed
by this skill:

- `java/` - OpenDataLoader PDF Java core and CLI main source, including its
  Maven project files.
- `LICENSE`, `NOTICE`, and `THIRD_PARTY/` - upstream license and attribution
  materials.
- `README.md` - upstream project context.

The upstream Java tests/resources, Python wrapper, Node wrapper, documentation
experiments, GitHub workflow files, release scripts, and sample PDFs are not
vendored here. They are not needed for the repo-local parser build path and
would make the skill package unnecessarily heavy.

## License And Notices

OpenDataLoader PDF is distributed under the Apache License, Version 2.0.
The upstream `LICENSE`, `NOTICE`, and `THIRD_PARTY` materials are preserved in
this repository and in this vendored snapshot.

The upstream third-party notice file lists veraPDF components under MPL-2.0 and
other dependencies under their respective licenses. Keep those materials with
any source or binary distribution that includes this vendored parser.

## Local Modification Policy

This snapshot is intended to stay unmodified. Repo-owned wrapper and conversion
logic belongs in the top-level `scripts/`, `tests/`, and documentation files.

If a future change modifies files under `vendor/opendataloader-pdf`, document it
in this file with:

- changed path,
- reason for the change,
- date,
- whether the original upstream header was preserved.

Current local modifications to upstream files: none.
