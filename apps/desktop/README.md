# PDFPPT Desktop

Lightweight local desktop shell for the PDFPPT converter.

The app is intentionally thin:

- the UI is vanilla Vite, not React;
- Tauri provides the native window and file dialogs;
- Rust commands run the local `pdfppt_core` CLI;
- no HTTP server is used in packaged builds.

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

## Packaging Target

The production build should bundle a platform-specific `pdfppt-core` sidecar:

- `pdfppt-core-aarch64-apple-darwin`
- `pdfppt-core-x86_64-apple-darwin`
- `pdfppt-core-x86_64-pc-windows-msvc.exe`

The parser JAR is configured as a Tauri resource in `src-tauri/tauri.conf.json`.
The next packaging step is to produce the sidecar binary with PyInstaller or a
native rewrite, then add it to `bundle.externalBin`.
