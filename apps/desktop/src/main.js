import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import "./styles.css";

const $ = (id) => document.getElementById(id);

const state = {
  busy: false,
  generatedPptx: null,
  downloadDefaultPath: null,
  visualSpecPath: null,
  components: [],
  componentSettings: {},
  selectedComponentId: null,
};

const defaultJavaCandidates = [
  "/opt/homebrew/opt/openjdk/bin/java",
  "/usr/local/opt/openjdk/bin/java",
  "java",
];

async function chooseDefaultJava() {
  for (const candidate of defaultJavaCandidates) {
    try {
      if (await invoke("check_java", { javaCmd: candidate })) {
        $("javaCmd").value = candidate;
        return;
      }
    } catch {
      // Try the next candidate.
    }
  }
  $("javaCmd").value = "java";
}

function setBusy(busy, label = "Ready") {
  state.busy = busy;
  $("status").textContent = label;
  for (const id of ["pickPdf", "pickSpec", "inspect", "convert", "renderSpec"]) {
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
  if (payload.components) {
    state.components = payload.components;
    if (!state.selectedComponentId && state.components.length > 0) {
      state.selectedComponentId = state.components[0].id;
    }
    renderComponents();
  }
}

function resetGenerated() {
  state.generatedPptx = null;
  state.downloadDefaultPath = null;
  $("download").disabled = true;
}

function resetComponents() {
  state.components = [];
  state.componentSettings = {};
  state.selectedComponentId = null;
  renderComponents();
}

function componentById(id) {
  return state.components.find((component) => component.id === id);
}

function componentSettings(id) {
  if (!state.componentSettings[id]) {
    const component = componentById(id);
    state.componentSettings[id] = {
      include: true,
      type: component?.type || "paragraph",
      content: component?.text || "",
      bounding_box: component?.bounding_box || null,
      font_size: component?.font_size ?? "",
    };
  }
  return state.componentSettings[id];
}

function settingsJson() {
  return JSON.stringify({ components: state.componentSettings });
}

function renderComponents() {
  const list = $("componentList");
  list.replaceChildren();
  if (state.components.length === 0) {
    const empty = document.createElement("div");
    empty.className = "component-empty";
    empty.textContent = "No components loaded.";
    list.appendChild(empty);
    $("settingsEmpty").hidden = false;
    $("settingsForm").hidden = true;
    return;
  }

  for (const component of state.components) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "component-item";
    if (component.id === state.selectedComponentId) {
      item.classList.add("selected");
    }
    const overrides = state.componentSettings[component.id];
    if (overrides?.include === false) {
      item.classList.add("excluded");
    }
    item.innerHTML = `<strong>${component.type}</strong><span>${component.label || component.id}</span>`;
    item.addEventListener("click", () => {
      state.selectedComponentId = component.id;
      renderComponents();
    });
    list.appendChild(item);
  }
  renderSelectedComponent();
}

function setInputValue(id, value) {
  $(id).value = value ?? "";
}

function renderSelectedComponent() {
  const component = componentById(state.selectedComponentId);
  if (!component) {
    $("settingsEmpty").hidden = false;
    $("settingsForm").hidden = true;
    return;
  }
  const settings = componentSettings(component.id);
  $("settingsEmpty").hidden = true;
  $("settingsForm").hidden = false;
  $("componentTitle").textContent = `#${component.id} / page ${component.page}`;
  $("componentInclude").checked = settings.include !== false;
  $("componentType").value = settings.type || component.type;
  setInputValue("componentText", settings.content ?? component.text);
  const bbox = settings.bounding_box || component.bounding_box || [];
  setInputValue("bboxLeft", bbox[0]);
  setInputValue("bboxBottom", bbox[1]);
  setInputValue("bboxRight", bbox[2]);
  setInputValue("bboxTop", bbox[3]);
  setInputValue("componentFontSize", settings.font_size ?? component.font_size);
}

function updateSelectedSettings() {
  const id = state.selectedComponentId;
  if (!id) {
    return;
  }
  const settings = componentSettings(id);
  settings.include = $("componentInclude").checked;
  settings.type = $("componentType").value;
  settings.content = $("componentText").value;
  const bbox = ["bboxLeft", "bboxBottom", "bboxRight", "bboxTop"].map((field) => Number($(field).value));
  settings.bounding_box = bbox.every((value) => Number.isFinite(value)) ? bbox : null;
  const fontSize = Number($("componentFontSize").value);
  if (Number.isFinite(fontSize) && fontSize > 0) {
    settings.font_size = fontSize;
  } else {
    delete settings.font_size;
  }
  resetGenerated();
  renderComponents();
}

function defaultPptxPath(pdfPath) {
  return pdfPath.replace(/\.pdf$/i, ".pptx");
}

function defaultSpecPptxPath(specPath) {
  return specPath.replace(/\.json$/i, ".pptx");
}

function selectPdf(path) {
  if (!path || !path.toLowerCase().endsWith(".pdf")) {
    setReport({ ok: false, error: "Drop or choose a PDF file." });
    return;
  }
  $("pdfPath").value = path;
  $("specPath").value = "";
  state.visualSpecPath = null;
  $("dropHint").textContent = path.split(/[\\/]/).pop();
  $("dropZone").classList.remove("drag-over");
  resetGenerated();
  resetComponents();
  setReport({ ok: true, command: "select", pdf: path });
}

function selectSpec(path) {
  if (!path || !path.toLowerCase().endsWith(".json")) {
    setReport({ ok: false, error: "Drop or choose a visual spec JSON file." });
    return;
  }
  $("specPath").value = path;
  $("pdfPath").value = "";
  state.visualSpecPath = path;
  $("dropHint").textContent = path.split(/[\\/]/).pop();
  $("dropZone").classList.remove("drag-over");
  resetGenerated();
  resetComponents();
  setReport({ ok: true, command: "select-spec", spec: path });
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
    settingsJson: settingsJson(),
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
    const command = kind === "inspect" ? "inspect_pdf" : "convert_pdf";
    const invokeArgs = kind === "inspect"
      ? { pdfPath: args.pdfPath, javaCmd: args.javaCmd, pages: args.pages }
      : args;
    const result = await invoke(command, invokeArgs);
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

async function runVisualSpec() {
  if (!state.visualSpecPath) {
    setReport({ ok: false, error: "Choose or drop a visual spec JSON first." });
    return;
  }
  setBusy(true, "Rendering");
  try {
    const result = await invoke("render_visual_spec", { specPath: state.visualSpecPath });
    const payload = parseStdout(result);
    setReport(payload);
    if (payload.ok && payload.pptx) {
      state.generatedPptx = payload.pptx;
      state.downloadDefaultPath = defaultSpecPptxPath(state.visualSpecPath);
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

$("pickSpec").addEventListener("click", async () => {
  const path = await invoke("pick_visual_spec");
  if (path) {
    selectSpec(path);
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
$("renderSpec").addEventListener("click", () => runVisualSpec());

for (const id of [
  "componentInclude",
  "componentType",
  "componentText",
  "bboxLeft",
  "bboxBottom",
  "bboxRight",
  "bboxTop",
  "componentFontSize",
]) {
  $(id).addEventListener("input", updateSelectedSettings);
  $(id).addEventListener("change", updateSelectedSettings);
}

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
    if (path?.toLowerCase().endsWith(".json")) {
      selectSpec(path);
    } else {
      selectPdf(path);
    }
  }
});

chooseDefaultJava();
renderComponents();
