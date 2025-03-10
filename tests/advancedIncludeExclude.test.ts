/*
Purpose: Tests the interaction between include (-i) and exclude patterns, ensuring that excludes take precedence over includes.
*/

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import os from "os";

const tempDir = path.join(os.tmpdir(), "ai-md-test-include-exclude");
const codebasePath = path.join(tempDir, "codebase.md");

async function runCLI(args: string = ""): Promise<void> {
  const cliPath = path.resolve(__dirname, "../src/cli.ts");
  // Split args but preserve quoted sections
  const argArray = args.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(arg => {
    // Remove quotes but keep the content
    const unquoted = arg.startsWith('"') && arg.endsWith('"') ? arg.slice(1, -1) : arg;
    return unquoted;
  }) || [];

  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", cliPath, ...argArray], {
      cwd: tempDir,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to start command: ${error.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(
          `Command failed with code ${code}\n` +
          `STDOUT: ${stdout}\n` +
          `STDERR: ${stderr}`
        ));
      }
    });
  });
}

describe("Advanced Include/Exclude Behavior", () => {
  beforeEach(async () => {
    // Create test directory structure
    await fs.mkdir(tempDir, { recursive: true });
    
    // Create folder-a and its contents
    await fs.mkdir(path.join(tempDir, "folder-a"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "folder-a", "root.txt"), "Root file in folder-a");
    
    // Create folder-a/folder-b and its contents
    await fs.mkdir(path.join(tempDir, "folder-a", "folder-b"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "folder-a", "folder-b", "b.txt"), "File in folder-b");
    
    // Create folder-a/folder-c and its contents
    await fs.mkdir(path.join(tempDir, "folder-a", "folder-c"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "folder-a", "folder-c", "c.txt"), "File in folder-c");

    // Create a file outside the included directory structure for control
    await fs.writeFile(path.join(tempDir, "outside.txt"), "File outside folder-a");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should respect exclude patterns within included directories", async () => {
    await runCLI('-i folder-a --ignore "folder-a/folder-b"');
    const content = await fs.readFile(codebasePath, "utf-8");
    
    // Should include files from folder-a
    expect(content).toContain("folder-a/root.txt");
    expect(content).toContain("folder-a/folder-c/c.txt");
    
    // Should exclude files from folder-b despite folder-a being included
    expect(content).not.toContain("folder-a/folder-b/b.txt");
    
    // Should not include files outside folder-a
    expect(content).not.toContain("outside.txt");
  });

  it("should process all files by default but respect excludes", async () => {
    await runCLI('--ignore "folder-a/folder-b"');
    const content = await fs.readFile(codebasePath, "utf-8");
    
    // Should include files from folder-a and root
    expect(content).toContain("folder-a/root.txt");
    expect(content).toContain("folder-a/folder-c/c.txt");
    expect(content).toContain("outside.txt");
    
    // Should exclude files from folder-b
    expect(content).not.toContain("folder-a/folder-b/b.txt");
  });

  it("should support glob patterns in includes and excludes", async () => {
    await runCLI('-i "**/*.txt" --ignore "**/folder-b/**"');
    const content = await fs.readFile(codebasePath, "utf-8");
    
    // Should include .txt files except those in folder-b
    expect(content).toContain("folder-a/root.txt");
    expect(content).toContain("folder-a/folder-c/c.txt");
    expect(content).toContain("outside.txt");
    expect(content).not.toContain("folder-a/folder-b/b.txt");
  });

  it("should handle multiple includes with excludes", async () => {
    await runCLI('-i folder-a -i outside.txt --ignore "**/folder-b/**"');
    const content = await fs.readFile(codebasePath, "utf-8");
    
    // Should include specifically included files and paths
    expect(content).toContain("folder-a/root.txt");
    expect(content).toContain("folder-a/folder-c/c.txt");
    expect(content).toContain("outside.txt");
    
    // Should exclude matched patterns even in included directories
    expect(content).not.toContain("folder-a/folder-b/b.txt");
  });
});