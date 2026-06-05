#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const desktopDir = join(repoRoot, "apps", "desktop");
const coreDir = join(repoRoot, "pdfppt_core");
const args = process.argv.slice(2);

function run(command, commandArgs, cwd) {
  const child = spawn(command, commandArgs, {
    cwd,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  child.on("exit", (code) => process.exit(code ?? 1));
  child.on("error", (error) => {
    console.error(error.message);
    process.exit(1);
  });
}

if (!existsSync(coreDir)) {
  console.error("This development launcher must be run from the source checkout.");
  process.exit(1);
}

if (args.length === 0 || args[0] === "app") {
  if (!existsSync(desktopDir)) {
    console.error("Desktop app directory not found.");
    process.exit(1);
  }
  run("npm", ["run", "tauri", "--", "dev"], desktopDir);
} else {
  run(process.env.PDFPPT_PYTHON || "python3", ["-m", "pdfppt_core", ...args], repoRoot);
}
