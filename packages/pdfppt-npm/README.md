# pdfppt npm launcher

Development scaffold for an eventual `npx pdfppt` entry point.

Current behavior from this source checkout:

```bash
node packages/pdfppt-npm/bin/pdfppt.js inspect input.pdf
node packages/pdfppt-npm/bin/pdfppt.js convert input.pdf output.pptx
node packages/pdfppt-npm/bin/pdfppt.js app
```

Production behavior should be changed to download or locate the platform-native
desktop build from GitHub Releases instead of requiring this source checkout.
