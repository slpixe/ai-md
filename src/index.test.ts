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

  it("should not remove whitespace for whitespace-dependent files", async () => {
    const { stdout } = await runCLI("--whitespace-removal");
    expect(stdout).toContain(
        "Whitespace removal enabled (except for whitespace-dependent languages)"
    );
  }, 10000);

  it("should disable default ignores when flag is set", async () => {
    const { stdout } = await runCLI("--no-default-ignores");
    expect(stdout).toContain("🛠️ Custom ignore patterns enabled.");
  }, 10000);

  it("should show output files when flag is set", async () => {
    const { stdout } = await runCLI("--show-output-files");
    expect(stdout).toContain("Files included in the output:");
  }, 10000);

  it("should include SVG file with correct type in codebase.md", async () => {
    const svgFile = path.join(tempDir, "smiley.svg");
    await fs.writeFile(svgFile, "<svg></svg>");

    await runCLI(`--input ${tempDir}`);

    const codebasePath = path.join(tempDir, "codebase.md");
    const content = await fs.readFile(codebasePath, 'utf-8');

    expect(content).toContain("smiley.svg");
    expect(content).toContain("This is a file of the type: SVG Image");
  }, 10000);

  it("should respect the --input flag", async () => {
    const testFile = path.join(tempDir, "test.txt");
    await fs.writeFile(testFile, "Test content");
    const { stdout } = await runCLI(`--input ${tempDir} --show-output-files`);
    expect(stdout).toContain("test.txt");
  }, 10000);

  it("should detect and include a binary and SVG file with correct headers", async () => {
    const binaryFile = path.join(tempDir, "test.bin");
    const svgFile = path.join(tempDir, "test.svg");
    await fs.writeFile(binaryFile, Buffer.from([0, 1, 2, 3]));
    await fs.writeFile(svgFile, "<svg></svg>");

    await runCLI(`--input ${tempDir}`);

    const codebasePath = path.join(tempDir, "codebase.md");
    const content = await fs.readFile(codebasePath, 'utf-8');

    expect(content).toContain("/ai-txt-test/test.bin");
    expect(content).toContain("This is a binary file of the type: Binary");
    expect(content).toContain("/ai-txt-test/test.svg");
    expect(content).toContain("This is a file of the type: SVG Image");
  }, 10000);
});
