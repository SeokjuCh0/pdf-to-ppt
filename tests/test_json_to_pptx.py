from pathlib import Path
import sys
import tempfile
import unittest

from pptx import Presentation

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from json_to_pptx import bbox_to_rect, convert_json_to_pptx, strip_subset_prefix


class JsonToPptxTests(unittest.TestCase):
    def test_bbox_to_rect_flips_pdf_origin(self):
        rect = bbox_to_rect([20, 90, 380, 210], page_height=300)
        self.assertEqual(rect.x, 20)
        self.assertEqual(rect.y, 90)
        self.assertEqual(rect.width, 360)
        self.assertEqual(rect.height, 120)

    def test_strip_subset_prefix(self):
        self.assertEqual(strip_subset_prefix("ABCDEF+Pretendard-Regular"), "Pretendard-Regular")

    def test_fixture_conversion_creates_editable_shapes(self):
        fixture = ROOT / "tests" / "fixtures" / "opendataloader_sample.json"
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "fixture.pptx"
            convert_json_to_pptx(fixture, output)
            self.assertTrue(output.exists())

            prs = Presentation(output)
            self.assertEqual(len(prs.slides), 1)
            self.assertEqual(prs.slide_width, 400 * 12700)
            self.assertEqual(prs.slide_height, 300 * 12700)
            texts = "\n".join(shape.text for shape in prs.slides[0].shapes if hasattr(shape, "text"))
            table_texts = []
            for shape in prs.slides[0].shapes:
                if not shape.has_table:
                    continue
                for row in shape.table.rows:
                    for cell in row.cells:
                        table_texts.append(cell.text)
            texts = "\n".join([texts, *table_texts])
            self.assertIn("2025 한국 부자 보고서", texts)
            self.assertIn("항목", texts)
            self.assertIn("1.0%", texts)


if __name__ == "__main__":
    unittest.main()
