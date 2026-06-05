use serde::Serialize;
use std::{
    env,
    fs,
    path::PathBuf,
    process::{Command, Stdio},
    time::{SystemTime, UNIX_EPOCH},
};

#[derive(Serialize)]
struct ProcessOutput {
    status: i32,
    stdout: String,
    stderr: String,
}

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../..")
        .canonicalize()
        .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")))
}

fn core_command(subcommand: &str) -> Command {
    if let Ok(binary) = env::var("PDFPPT_CORE_BIN") {
        let mut command = Command::new(binary);
        command.arg(subcommand);
        return command;
    }

    let python = env::var("PDFPPT_PYTHON").unwrap_or_else(|_| "python3".to_string());
    let mut command = Command::new(python);
    command
        .current_dir(repo_root())
        .arg("-m")
        .arg("pdfppt_core")
        .arg(subcommand);
    command
}

fn run_command(mut command: Command) -> Result<ProcessOutput, String> {
    let output = command
        .stdin(Stdio::null())
        .output()
        .map_err(|error| error.to_string())?;
    Ok(ProcessOutput {
        status: output.status.code().unwrap_or(-1),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

fn default_temp_pptx_path(pdf_path: &str) -> PathBuf {
    let stem = PathBuf::from(pdf_path)
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("pdfppt")
        .to_string();
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    env::temp_dir()
        .join("pdfppt")
        .join(format!("{stem}-{timestamp}.pptx"))
}

#[tauri::command]
fn pick_pdf() -> Option<String> {
    rfd::FileDialog::new()
        .add_filter("PDF", &["pdf"])
        .pick_file()
        .map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
fn pick_visual_spec() -> Option<String> {
    rfd::FileDialog::new()
        .add_filter("Visual Spec JSON", &["json"])
        .pick_file()
        .map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
fn check_java(java_cmd: String) -> bool {
    Command::new(java_cmd)
        .arg("-version")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

#[tauri::command]
fn pick_output(default_path: Option<String>) -> Option<String> {
    let mut dialog = rfd::FileDialog::new().add_filter("PowerPoint", &["pptx"]);
    if let Some(path) = default_path {
        let path = PathBuf::from(path);
        if let Some(parent) = path.parent() {
            dialog = dialog.set_directory(parent);
        }
        if let Some(name) = path.file_name() {
            dialog = dialog.set_file_name(name.to_string_lossy().to_string());
        }
    }
    dialog
        .save_file()
        .map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
fn inspect_pdf(pdf_path: String, java_cmd: String, pages: Option<String>) -> Result<ProcessOutput, String> {
    let mut command = core_command("inspect");
    command.arg(pdf_path).arg("--java").arg(java_cmd);
    if let Some(pages) = pages.filter(|value| !value.trim().is_empty()) {
        command.arg("--pages").arg(pages);
    }
    run_command(command)
}

#[tauri::command]
fn convert_pdf(
    pdf_path: String,
    pptx_path: Option<String>,
    java_cmd: String,
    pages: Option<String>,
    settings_json: Option<String>,
) -> Result<ProcessOutput, String> {
    let pptx_path = pptx_path
        .filter(|value| !value.trim().is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| default_temp_pptx_path(&pdf_path));
    if let Some(parent) = pptx_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let json_path = PathBuf::from(&pptx_path).with_extension("json");
    let settings_path = if let Some(settings_json) = settings_json.filter(|value| !value.trim().is_empty()) {
        let path = env::temp_dir().join("pdfppt").join("component-settings.json");
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        fs::write(&path, settings_json).map_err(|error| error.to_string())?;
        Some(path)
    } else {
        None
    };
    let mut command = core_command("convert");
    command
        .arg(pdf_path)
        .arg(&pptx_path)
        .arg("--java")
        .arg(java_cmd)
        .arg("--json-output")
        .arg(json_path);
    if let Some(settings_path) = settings_path {
        command.arg("--settings").arg(settings_path);
    }
    if let Some(pages) = pages.filter(|value| !value.trim().is_empty()) {
        command.arg("--pages").arg(pages);
    }
    run_command(command)
}

#[tauri::command]
fn download_pptx(source_path: String, default_path: Option<String>) -> Result<String, String> {
    let source = PathBuf::from(source_path);
    if !source.is_file() {
        return Err(format!("PPTX not found: {}", source.display()));
    }
    let mut dialog = rfd::FileDialog::new().add_filter("PowerPoint", &["pptx"]);
    if let Some(path) = default_path {
        let path = PathBuf::from(path);
        if let Some(parent) = path.parent() {
            dialog = dialog.set_directory(parent);
        }
        if let Some(name) = path.file_name() {
            dialog = dialog.set_file_name(name.to_string_lossy().to_string());
        }
    }
    let Some(target) = dialog.save_file() else {
        return Err("Save cancelled.".to_string());
    };
    fs::copy(&source, &target).map_err(|error| error.to_string())?;
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
fn render_visual_spec(spec_path: String) -> Result<ProcessOutput, String> {
    let pptx_path = default_temp_pptx_path(&spec_path);
    if let Some(parent) = pptx_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let mut command = core_command("visual-spec");
    command.arg(spec_path).arg(pptx_path);
    run_command(command)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            pick_pdf,
            pick_visual_spec,
            check_java,
            pick_output,
            inspect_pdf,
            convert_pdf,
            download_pptx,
            render_visual_spec
        ])
        .run(tauri::generate_context!())
        .expect("failed to run PDFPPT desktop app");
}
