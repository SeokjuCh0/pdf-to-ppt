import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import "./styles.css";

const $ = (id) => document.getElementById(id);

const state = {
  busy: false,
  generatedPptx: null,
  downloadDefaultPath: null,
};

function setBusy(busy, label = "Ready") {
  state.busy = busy;
  $("status").textContent = label;
  for (const id of ["pickPdf", "inspect", "convert"]) {
    $(id).disabled = busy;
  }
  $("download").disabled = busy || !state.generatedPptx;
}

function setReport(payload) {
  $("output").textContent = JSON.stringify(payload, null, 2);
  const pptx = payload.pptx_summary || {};
  const layout = payload.layout || {};
  $("slides").textContent = pptx.slides ?? layout.pages ?? "-";
  $("textShapes").textContent = pptx.text_shapes ?? layout.text_objects ?? "-";
  $("tables").textContent = pptx.tables ?? layout.tables ?? "-";
  $("pictures").textContent = pptx.pictures ?? layout.images ?? "-";
  const warnings = [...(layout.warnings || []), ...(pptx.warnings || [])];
  $("warnings").replaceChildren(
    ...warnings.map((warning) => {
      const item = document.createElement("div");
      item.className = "warning";
      item.textContent = warning;
      return item;
    }),
  );
}

function resetGenerated() {
  state.generatedPptx = null;
  state.downloadDefaultPath = null;
  $("download").disabled = true;
}

function defaultPptxPath(pdfPath) {
  return pdfPath.replace(/\.pdf$/i, ".pptx");
}

function selectPdf(path) {
  if (!path || !path.toLowerCase().endsWith(".pdf")) {
    setReport({ ok: false, error: "Drop or choose a PDF file." });
    return;
  }
  $("pdfPath").value = path;
  $("dropHint").textContent = path.split(/[\\/]/).pop();
  $("dropZone").classList.remove("drag-over");
  resetGenerated();
  setReport({ ok: true, command: "select", pdf: path });
}

function parseStdout(result) {
  if (!result.stdout) {
    return { ok: false, error: result.stderr || "No output returned from converter." };
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    return { ok: false, stdout: result.stdout, stderr: result.stderr };
  }
}

function commandArgs() {
  return {
    pdfPath: $("pdfPath").value.trim(),
    javaCmd: $("javaCmd").value.trim() || "java",
    pages: $("pages").value.trim() || null,
  };
}

async function runCommand(kind) {
  const args = commandArgs();
  if (!args.pdfPath) {
    setReport({ ok: false, error: "Choose a PDF file first." });
    return;
  }
  setBusy(true, kind === "inspect" ? "Inspecting" : "Converting");
  try {
    const result = await invoke(kind === "inspect" ? "inspect_pdf" : "convert_pdf", args);
    const payload = parseStdout(result);
    setReport(payload);
    if (kind === "convert" && payload.ok && payload.pptx) {
      state.generatedPptx = payload.pptx;
      state.downloadDefaultPath = defaultPptxPath(args.pdfPath);
      $("download").disabled = false;
    }
    $("status").textContent = result.status === 0 ? "Done" : "Failed";
  } catch (error) {
    setReport({ ok: false, error: String(error) });
    $("status").textContent = "Failed";
  } finally {
    setBusy(false, $("status").textContent);
  }
}

$("pickPdf").addEventListener("click", async () => {
  const path = await invoke("pick_pdf");
  if (path) {
    selectPdf(path);
  }
});

$("download").addEventListener("click", async () => {
  if (!state.generatedPptx) {
    return;
  }
  setBusy(true, "Saving");
  try {
    const saved = await invoke("download_pptx", {
      sourcePath: state.generatedPptx,
      defaultPath: state.downloadDefaultPath,
    });
    setReport({ ok: true, command: "download", pptx: saved });
    $("status").textContent = "Saved";
  } catch (error) {
    setReport({ ok: false, error: String(error) });
    $("status").textContent = "Failed";
  } finally {
    setBusy(false, $("status").textContent);
  }
});

$("inspect").addEventListener("click", () => runCommand("inspect"));
$("convert").addEventListener("click", () => runCommand("convert"));

getCurrentWebview().onDragDropEvent((event) => {
  if (event.payload.type === "enter" || event.payload.type === "over") {
    $("dropZone").classList.add("drag-over");
    return;
  }
  if (event.payload.type === "leave") {
    $("dropZone").classList.remove("drag-over");
    return;
  }
  if (event.payload.type === "drop") {
    $("dropZone").classList.remove("drag-over");
    const [path] = event.payload.paths || [];
    selectPdf(path);
  }
});
