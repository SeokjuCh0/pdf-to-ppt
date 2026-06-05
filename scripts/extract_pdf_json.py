#!/usr/bin/env python3
"""Run the repo-built OpenDataLoader parser JAR and locate JSON output."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ARTIFACT = ROOT / "build" / "opendataloader" / "opendataloader-pdf-cli.jar"
VENDORED_TARGET = ROOT / "vendor" / "opendataloader-pdf" / "java" / "opendataloader-pdf-cli" / "target"


def find_parser_jar(explicit: str | None = None) -> Path:
    if explicit:
        jar = Path(explicit).expanduser().resolve()
        if not jar.is_file():
            raise FileNotFoundError(f"Parser JAR not found: {jar}")
        return jar

    if DEFAULT_ARTIFACT.is_file():
        return DEFAULT_ARTIFACT

    if VENDORED_TARGET.is_dir():
        jars = sorted(
            p for p in VENDORED_TARGET.glob("opendataloader-pdf-cli-*.jar")
            if not p.name.startswith("original-")
            and "-sources" not in p.name
            and "-javadoc" not in p.name
        )
        if jars:
            return jars[-1]

    raise FileNotFoundError(
        "Repo-built parser JAR not found. Run scripts/build_parser.sh first, "
        "or pass --jar /path/to/repo-built/opendataloader-pdf-cli.jar. "
        "This script intentionally does not fall back to opendataloader-pdf on PATH."
    )


def expected_json_path(pdf_path: Path, output_dir: Path) -> Path:
    return output_dir / f"{pdf_path.stem}.json"


def extract_pdf_json(
    pdf_path: Path,
    output_dir: Path,
    *,
    jar: Path,
    java_cmd: str = "java",
    pages: str | None = None,
    table_method: str = "cluster",
    reading_order: str = "xycut",
    image_output: str = "external",
    quiet: bool = True,
) -> Path:
    pdf_path = pdf_path.expanduser().resolve()
    output_dir = output_dir.expanduser().resolve()
    if not pdf_path.is_file():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    output_dir.mkdir(parents=True, exist_ok=True)
    command = [
        java_cmd,
        "-jar",
        str(jar),
        "--format",
        "json",
        "--table-method",
        table_method,
        "--reading-order",
        reading_order,
        "--image-output",
        image_output,
        "--output-dir",
        str(output_dir),
    ]
    if quiet:
        command.append("--quiet")
    if pages:
        command.extend(["--pages", pages])
    command.append(str(pdf_path))

    try:
        subprocess.run(command, check=True)
    except FileNotFoundError as exc:
        raise RuntimeError(f"Java command not found: {java_cmd}") from exc

    json_path = expected_json_path(pdf_path, output_dir)
    if not json_path.is_file():
        candidates = sorted(output_dir.glob("*.json"))
        if len(candidates) == 1:
            return candidates[0]
        raise FileNotFoundError(f"Parser completed but JSON output was not found at {json_path}")
    return json_path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path, help="Input PDF path.")
    parser.add_argument("output", type=Path, nargs="?", help="Optional JSON output path.")
    parser.add_argument("--output-dir", type=Path, help="Directory for parser outputs.")
    parser.add_argument("--jar", help="Repo-built OpenDataLoader parser JAR.")
    parser.add_argument("--java", default="java", help="Java command to run.")
    parser.add_argument("--pages", help='Pages to extract, for example "1,3,5-7".')
    parser.add_argument("--table-method", default="cluster", choices=["default", "cluster"])
    parser.add_argument("--reading-order", default="xycut", choices=["off", "xycut"])
    parser.add_argument("--image-output", default="external", choices=["off", "embedded", "external"])
    parser.add_argument("--no-quiet", action="store_true", help="Do not pass --quiet to the parser.")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        jar = find_parser_jar(args.jar)
        output_dir = args.output_dir
        if output_dir is None:
            output_dir = args.output.parent if args.output else args.pdf.parent
        json_path = extract_pdf_json(
            args.pdf,
            output_dir,
            jar=jar,
            java_cmd=args.java,
            pages=args.pages,
            table_method=args.table_method,
            reading_order=args.reading_order,
            image_output=args.image_output,
            quiet=not args.no_quiet,
        )
        if args.output:
            target = args.output.expanduser().resolve()
            target.parent.mkdir(parents=True, exist_ok=True)
            if json_path.resolve() != target:
                shutil.copyfile(json_path, target)
            json_path = target
        print(json_path)
        return 0
    except Exception as exc:
        print(f"extract_pdf_json: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
