#!/usr/bin/env python3
"""End-to-end PDF to editable PPTX pipeline using the repo-built parser."""

from __future__ import annotations

import argparse
import sys
import tempfile
from pathlib import Path

from extract_pdf_json import extract_pdf_json, find_parser_jar
from json_to_pptx import convert_json_to_pptx


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path, help="Input PDF path.")
    parser.add_argument("pptx", type=Path, help="Output PPTX path.")
    parser.add_argument("--json-output", type=Path, help="Keep parser JSON at this path.")
    parser.add_argument("--work-dir", type=Path, help="Directory for parser outputs.")
    parser.add_argument("--jar", help="Repo-built OpenDataLoader parser JAR.")
    parser.add_argument("--java", default="java", help="Java command to run.")
    parser.add_argument("--pages", help='Pages to extract, for example "1,3,5-7".')
    parser.add_argument("--table-method", default="cluster", choices=["default", "cluster"])
    parser.add_argument("--reading-order", default="xycut", choices=["off", "xycut"])
    parser.add_argument("--image-output", default="external", choices=["off", "embedded", "external"])
    parser.add_argument("--page-width", type=float, help="Source page width in PDF points.")
    parser.add_argument("--page-height", type=float, help="Source page height in PDF points.")
    parser.add_argument("--fallback-font", default="Pretendard")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        jar = find_parser_jar(args.jar)
        if args.work_dir:
            work_dir = args.work_dir.expanduser().resolve()
            work_dir.mkdir(parents=True, exist_ok=True)
            json_path = extract_pdf_json(
                args.pdf,
                work_dir,
                jar=jar,
                java_cmd=args.java,
                pages=args.pages,
                table_method=args.table_method,
                reading_order=args.reading_order,
                image_output=args.image_output,
            )
            convert_json_to_pptx(
                json_path,
                args.pptx.expanduser().resolve(),
                page_width=args.page_width,
                page_height=args.page_height,
                fallback_font=args.fallback_font,
            )
            if args.json_output:
                target = args.json_output.expanduser().resolve()
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(json_path.read_bytes())
        else:
            with tempfile.TemporaryDirectory(prefix="pdf-to-pptx-") as tmp:
                json_path = extract_pdf_json(
                    args.pdf,
                    Path(tmp),
                    jar=jar,
                    java_cmd=args.java,
                    pages=args.pages,
                    table_method=args.table_method,
                    reading_order=args.reading_order,
                    image_output=args.image_output,
                )
                convert_json_to_pptx(
                    json_path,
                    args.pptx.expanduser().resolve(),
                    page_width=args.page_width,
                    page_height=args.page_height,
                    fallback_font=args.fallback_font,
                )
                if args.json_output:
                    target = args.json_output.expanduser().resolve()
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(json_path.read_bytes())
        print(args.pptx.expanduser().resolve())
        return 0
    except Exception as exc:
        print(f"pdf_to_pptx: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
