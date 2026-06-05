# PDFPPT Desktop

Lightweight local desktop shell for the PDFPPT converter.

The app is intentionally thin:

- the UI is vanilla Vite, not React;
- Tauri provides the native window and file dialogs;
- Rust commands run the local `pdfppt_core` CLI;
- no HTTP server is used in packaged builds.

## Workflow

1. Drag a PDF onto the drop zone, or click `Choose PDF`.
2. Run `Inspect` to see parser/editability warnings before conversion.
3. Select components in the inspector and adjust include/type/text/bbox/font-size.
4. Run `Convert` to create a temporary PPTX with those component settings.
5. Click `Download PPTX` to choose where the generated file is saved.

For visual reconstruction, drag a visual spec JSON produced from
`prompts/visual-spec-chatgpt-pro.md`, click `Render Spec`, then download the
PPTX.

For graph labels or dense chart text that OpenDataLoader misses, choose a PDF
and click `Text Layer`. This uses Poppler raw text bounding boxes and does not
require Java.

On macOS, click `OCR Layer` when graph labels are embedded inside chart images.
It uses the built-in Vision OCR engine, so no OCR model is bundled with the app.

## Development

From this directory:

```bash
npm install
npm run tauri -- dev
```

During development the Rust layer runs:

```bash
python3 -m pdfppt_core inspect ...
python3 -m pdfppt_core convert ...
```

from the repository root. Override the Python executable with:

```bash
PDFPPT_PYTHON=/path/to/python npm run tauri -- dev
```

Override the converter binary with:

```bash
PDFPPT_CORE_BIN=/path/to/pdfppt-core npm run tauri -- dev
```

On macOS with Homebrew OpenJDK, the UI auto-detects:

```text
/opt/homebrew/opt/openjdk/bin/java
```

If conversion reports that Java cannot be located, put that path in the Java
field before running `Inspect` or `Convert`.

## Packaging Target

The production build should bundle a platform-specific `pdfppt-core` sidecar:

- `pdfppt-core-aarch64-apple-darwin`
- `pdfppt-core-x86_64-apple-darwin`
- `pdfppt-core-x86_64-pc-windows-msvc.exe`

The parser JAR is configured as a Tauri resource in `src-tauri/tauri.conf.json`.
The next packaging step is to produce the sidecar binary with PyInstaller or a
native rewrite, then add it to `bundle.externalBin`.
