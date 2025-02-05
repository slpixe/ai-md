import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from 'fs/promises';
import os from 'os';
import {ExecOptions} from "node:child_process";

const execAsync = promisify(exec);
const tempDir = path.join(os.tmpdir(), "ai-txt-test");
const ignoreFilePath = path.join(tempDir, ".aidigestignore");

async function runCLI(args: string = "", opts: ExecOptions = {}) {
  const cliPath = path.resolve(__dirname, "index.ts");
  return execAsync(`tsx ${cliPath} ${args}`, { ...opts, cwd: tempDir });
}

describe("AI Digest CLI", () => {
  beforeEach(async () => {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(ignoreFilePath, "*.log\nnode_modules");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should generate codebase.md by default", async () => {
    const { stdout } = await runCLI();
    expect(stdout).toMatch(/Files aggregated successfully into .*codebase\.md/);
  }, 10000);

  it("should respect custom output file", async () => {
    const { stdout } = await runCLI("-o custom_output.md");
    expect(stdout).toMatch(/Files aggregated successfully into .*custom_output\.md/);
  }, 10000);

  it("should ignore files based on .aidigestignore", async () => {
    const testFile = path.join(tempDir, "test.log");
    await fs.writeFile(testFile, "This should be ignored");
    const { stdout } = await runCLI(`--input ${tempDir}`);
    expect(stdout).toContain("📄 Found .aidigestignore file in");
    expect(stdout).toContain("📄 Ignore patterns from .aidigestignore:");
    expect(stdout).toContain("🚫 Files ignored by custom patterns: 1");
  }, 10000);
});