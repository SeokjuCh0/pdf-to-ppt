use serde::Serialize;
use std::{
    env,
    path::PathBuf,
    process::{Command, Stdio},
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

#[tauri::command]
fn pick_pdf() -> Option<String> {
    rfd::FileDialog::new()
        .add_filter("PDF", &["pdf"])
        .pick_file()
        .map(|path| path.to_string_lossy().to_string())
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
    pptx_path: String,
    java_cmd: String,
    pages: Option<String>,
) -> Result<ProcessOutput, String> {
    let json_path = PathBuf::from(&pptx_path).with_extension("json");
    let mut command = core_command("convert");
    command
        .arg(pdf_path)
        .arg(&pptx_path)
        .arg("--java")
        .arg(java_cmd)
        .arg("--json-output")
        .arg(json_path);
    if let Some(pages) = pages.filter(|value| !value.trim().is_empty()) {
        command.arg("--pages").arg(pages);
    }
    run_command(command)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            pick_pdf,
            pick_output,
            inspect_pdf,
            convert_pdf
        ])
        .run(tauri::generate_context!())
        .expect("failed to run PDFPPT desktop app");
}
