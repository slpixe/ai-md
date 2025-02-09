/*
Purpose: Ensures that CLI ignore patterns work correctly, both independently and in combination with other ignore methods.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import os from "os";

const execAsync = promisify(exec);
const tempDir = path.join(os.tmpdir(), "ai-md-test-cli-ignore");
const ignoreFilePath = path.join(tempDir, ".aidigestignore");
const codebasePath = path.join(tempDir, "codebase.md");

async function runCLI(args: string = "") {
  const cliPath = path.resolve(__dirname, "../src/cli.ts");
  return execAsync(`npx tsx ${cliPath} ${args}`, { cwd: tempDir });
}

describe("CLI Ignore Behavior", () => {
  beforeEach(async () => {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(path.join(tempDir, "a.ts"), "// TypeScript file");
    await fs.writeFile(path.join(tempDir, "b.css"), "/* CSS file */");
    await fs.mkdir(path.join(tempDir, "folder-b"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "folder-b", "test.js"), "// JS file");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should respect single CLI ignore pattern", async () => {
    await runCLI('--ignore "a.ts"');
    const content = await fs.readFile(codebasePath, 'utf-8');
    expect(content).not.toContain("a.ts");
    expect(content).toContain("b.css");
  });

  it("should respect multiple CLI ignore patterns", async () => {
    await runCLI('--ignore "a.ts" --ignore "b.css"');
    const content = await fs.readFile(codebasePath, 'utf-8');
    expect(content).not.toContain("a.ts");
    expect(content).not.toContain("b.css");
    expect(content).toContain("test.js");
  });

  it("should support glob patterns in CLI ignores", async () => {
    await runCLI('--ignore "*.css"');
    const content = await fs.readFile(codebasePath, 'utf-8');
    expect(content).toContain("a.ts");
    expect(content).not.toContain("b.css");
  });

  it("should support directory ignores in CLI patterns", async () => {
    await runCLI('--ignore "folder-b"');
    const content = await fs.readFile(codebasePath, 'utf-8');
    expect(content).toContain("a.ts");
    expect(content).not.toContain("test.js");
  });

  it("should combine CLI ignores with .aidigestignore", async () => {
    await fs.writeFile(ignoreFilePath, "*.css");
    await runCLI('--ignore "a.ts"');
    const content = await fs.readFile(codebasePath, 'utf-8');
    expect(content).not.toContain("a.ts");
    expect(content).not.toContain("b.css");
    expect(content).toContain("test.js");
  });

  it("should work with --no-default-ignores flag", async () => {
    await runCLI('--no-default-ignores --ignore "*.css"');
    const content = await fs.readFile(codebasePath, 'utf-8');
    expect(content).toContain("a.ts");
    expect(content).not.toContain("b.css");
  });
});
