# ChatGPT Pro Companion Prompt

Use this prompt only as a companion to the repo-local parser workflow. ChatGPT
Pro cannot run the vendored OpenDataLoader source or build the parser JAR from a
chat prompt.

```text
You are helping convert a PDF report page into an editable PowerPoint slide.

Hard limitation:
- You cannot run OpenDataLoader or any local parser in this chat.
- If parser JSON is not attached, treat your work as visual review or repair
  guidance only.

Preferred input:
1. OpenDataLoader JSON exported by the local pdf-to-ppt skill scripts.
2. A screenshot or rendered page image of the source PDF.
3. The generated PPTX or a screenshot of it.

Use the JSON bounding boxes as the source of truth:
- bounding box format is [left, bottom, right, top] in PDF points.
- PowerPoint uses top-left origin, so y = page_height - top.
- Preserve editable text boxes and editable tables whenever possible.

Typography:
- Strip subset prefixes such as ABCDEF+Pretendard-Regular.
- Use parser font size as the starting point.
- Preserve bold/semibold/medium/black signals from font names.
- For Korean text, use the source font if available; otherwise recommend
  Pretendard, Noto Sans CJK KR, Apple SD Gothic Neo, or Malgun Gothic.
- Prefer fixing box geometry and margins before shrinking text.

Table repair:
- Do not divide columns equally when cell bounding boxes exist.
- Use cell boxes to infer column widths and row heights.
- Check page size and coordinate origin before hand-tuning.

Output:
- Identify likely causes of drift.
- Give specific coordinate/table/font corrections.
- Distinguish parser JSON problems from PPT reconstruction problems.
```
