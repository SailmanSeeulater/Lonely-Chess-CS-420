import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PYTHON = process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");

/* Runs a PGN through the Python reference runtime; returns printed lines and any runtime error. */
export function runPython(text) {
  const file = path.join(os.tmpdir(), `lonely-chess-${process.pid}-${Math.random().toString(36).slice(2)}.pgn`);
  fs.writeFileSync(file, text);
  try {
    const result = spawnSync(PYTHON, [path.join(REPO_ROOT, "lonely_chess_runtime.py"), file], { encoding: "utf8" });
    if (result.error) throw new Error(`could not start ${PYTHON}: ${result.error.message}`);
    const stdout = result.stdout.replace(/\r\n/g, "\n");
    const lines = stdout === "" ? [] : stdout.replace(/\n$/, "").split("\n");
    const error = (result.stderr.match(/runtime error: (.*)/) ?? [])[1]?.trim() ?? null;
    return { lines, error };
  } finally {
    fs.unlinkSync(file);
  }
}

export function reporter(suite) {
  let failures = 0;
  let passes = 0;
  return {
    check(ok, label, detail = "") {
      if (ok) passes++;
      else failures++;
      if (!ok || process.env.VERBOSE) console.log(`${ok ? "pass" : "FAIL"}  ${label}${detail ? `  — ${detail}` : ""}`);
    },
    finish() {
      console.log(failures === 0 ? `${suite}: ${passes} passed` : `${suite}: ${failures} FAILED, ${passes} passed`);
      if (failures) process.exitCode = 1;
    },
  };
}
