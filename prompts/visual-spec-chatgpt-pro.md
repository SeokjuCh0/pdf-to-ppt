# ChatGPT Pro Visual Spec Prompt

Use this when the slide is visually complex and OpenDataLoader extracts charts
or decorations as images instead of editable components.

## Input

Attach the image or PDF slide you want to convert.

If available, also attach the `pdfppt inspect` JSON so text and PDF bounding
boxes can be used as supporting evidence. The screenshot/image is the visual
source of truth.

## Role

You rebuild image/PDF slides into editable PowerPoint components. Do not create
the `.pptx` directly. Instead, output a JSON component spec that `pdfppt
visual-spec` can render with native PowerPoint shapes and text boxes.

## Task

1. Observe the original image and list only elements that actually exist.
2. Measure position, size, color, and font size from the original image.
3. Copy text character for character, preserving punctuation, brackets, symbols,
   full-width/half-width characters, and spacing.
4. Represent text as `type: "text"` components.
5. Represent decorations as native shape components: `rect` or `line`.
6. Represent adjustable graphs as `type: "chart"` components whenever the
   categories, series names, and values are readable.
7. Use `dash: "sysDash"` or `dash: "sysDot"` for dotted/dashed borders.
8. Do not place a full-slide raster background.
9. Use raster images only for actual image/photo regions that cannot reasonably
   be represented as native shapes.

## Output

Return JSON only. Do not wrap it in Markdown.

```json
{
  "canvas": {
    "width": 1600,
    "height": 900,
    "width_in": 13.333,
    "height_in": 7.5
  },
  "components": [
    {
      "id": "title",
      "type": "text",
      "x": 120,
      "y": 72,
      "w": 760,
      "h": 80,
      "text": "Exact text",
      "font": "Arial",
      "font_size": 28,
      "color": "#1E2528",
      "bold": true,
      "word_wrap": false,
      "extra_right_margin_pt": 60
    },
    {
      "id": "box-1",
      "type": "rect",
      "x": 100,
      "y": 180,
      "w": 800,
      "h": 220,
      "fill": "none",
      "stroke": "#226A55",
      "stroke_width": 1.5,
      "dash": "sysDash"
    },
    {
      "id": "rule-1",
      "type": "line",
      "x1": 100,
      "y1": 420,
      "x2": 900,
      "y2": 420,
      "stroke": "#B26A25",
      "stroke_width": 2,
      "dash": "sysDot"
    },
    {
      "id": "chart-1",
      "type": "chart",
      "chart_type": "stacked-column-100",
      "x": 120,
      "y": 480,
      "w": 760,
      "h": 280,
      "categories": ["2023", "2024", "2025"],
      "series": [
        { "name": "금융", "values": [17.0, 12.0, 19.0], "color": "#FAC858" },
        { "name": "부동산", "values": [29.8, 27.0, 25.8], "color": "#4FA8A5" }
      ],
      "legend": true,
      "data_labels": true
    }
  ]
}
```

## Rules

- `x`, `y`, `w`, `h`, `x1`, `y1`, `x2`, `y2` are in source image pixels.
- `font_size` is in PowerPoint points after proportional normalization.
- If you can only estimate font size in source pixels, use `font_size_px`
  instead of `font_size`; the local renderer will normalize it to points.
- Colors must be exact `#RRGGBB` values sampled from the image.
- Prefer native `text`, `rect`, and `line` components over images.
- For chart components, valid `chart_type` values include `stacked-column`,
  `stacked-column-100`, `stacked-bar`, `stacked-bar-100`, `stacked-area`,
  `stacked-area-100`, `column`, `bar`, `area`, and `line`.
- Do not invent template elements that are not visible in the original.
- Do not chase pixel perfection; prioritize flaws viewers would notice.
