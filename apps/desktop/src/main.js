import { invoke } from "@tauri-apps/api/core";
import "./styles.css";

const $ = (id) => document.getElementById(id);

const state = {
  busy: false,
};

function setBusy(busy, label = "Ready") {
  state.busy = busy;
  $("status").textContent = label;
  for (const id of ["pickPdf", "pickPptx", "inspect", "convert"]) {
    $(id).disabled = busy;
  }
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
    pptxPath: $("pptxPath").value.trim(),
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
  if (kind === "convert" && !args.pptxPath) {
    setReport({ ok: false, error: "Choose an output PPTX path first." });
    return;
  }
  setBusy(true, kind === "inspect" ? "Inspecting" : "Converting");
  try {
    const result = await invoke(kind === "inspect" ? "inspect_pdf" : "convert_pdf", args);
    setReport(parseStdout(result));
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
    $("pdfPath").value = path;
    if (!$("pptxPath").value) {
      $("pptxPath").value = path.replace(/\.pdf$/i, ".pptx");
    }
  }
});

$("pickPptx").addEventListener("click", async () => {
  const fallback = $("pptxPath").value || $("pdfPath").value.replace(/\.pdf$/i, ".pptx");
  const path = await invoke("pick_output", { defaultPath: fallback || null });
  if (path) {
    $("pptxPath").value = path;
  }
});

$("inspect").addEventListener("click", () => runCommand("inspect"));
$("convert").addEventListener("click", () => runCommand("convert"));
