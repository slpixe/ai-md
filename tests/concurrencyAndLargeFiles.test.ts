/*
Purpose: Ensures large files are skipped properly, and concurrency does not cause corruption.
 */

import {describe, it, expect, beforeEach, afterEach} from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import os from "os";

const execAsync = promisify(exec);
const tempDir = path.join(os.tmpdir(), "ai-md-test-concurrency-large");

async function runCLI(args: string = "") {
	const cliPath = path.resolve(__dirname, "../src/cli.ts");
	return execAsync(`npx tsx ${cliPath} ${args}`, { cwd: tempDir });
}

describe("Concurrency & Large Files", () => {
beforeEach(async () => {
  await fs.mkdir(tempDir, {recursive: true});
  
  // Create multiple test files
  for (let i = 1; i <= 10; i++) {
    await fs.writeFile(
      path.join(tempDir, `test${i}.txt`),
      `Content for file ${i}\n`.repeat(100)
    );
  }
});

	afterEach(async () => {
		await fs.rm(tempDir, {recursive: true, force: true});
	});

	it("should skip large text files", async () => {
		const largeFile = path.join(tempDir, "large.txt");
		await fs.writeFile(largeFile, "a".repeat(6.1 * 1024 * 1024)); // 6.1MB

		const { stdout } = await runCLI(`--input ${tempDir}`);

		// Print CLI output to debug
		console.log("CLI Output:\n", stdout);

		// Read the generated file instead
		const codebasePath = path.join(tempDir, "codebase.md");
		const content = await fs.readFile(codebasePath, "utf-8");
		console.log("Final Aggregated Content:\n", content);

		expect(content).toContain("(This text file is > 5.0 MB, skipping content.)");
	});

describe("concurrent processing", () => {
  it("should run sequentially when --concurrent is not used", async () => {
    const { stdout } = await runCLI(`--input ${tempDir} -f`);
    expect(stdout).toContain("✅ Files aggregated successfully");
    expect(stdout).toContain("🔄 Running sequentially (no concurrency)");
    
    // Verify all files were processed
    const codebasePath = path.join(tempDir, "codebase.md");
    const content = await fs.readFile(codebasePath, "utf-8");
    for (let i = 1; i <= 10; i++) {
      expect(content).toContain(`test${i}.txt`);
    }
  });

  it("should use default concurrency (4) when --concurrent is used without value", async () => {
    const { stdout } = await runCLI(`--input ${tempDir} -c -f`);
    expect(stdout).toContain("✅ Files aggregated successfully");
    expect(stdout).toContain("🔄 Using concurrent processing with 4 workers");
    
    // Verify all files were processed
    const codebasePath = path.join(tempDir, "codebase.md");
    const content = await fs.readFile(codebasePath, "utf-8");
    for (let i = 1; i <= 10; i++) {
      expect(content).toContain(`test${i}.txt`);
    }
  });

  it("should use specified concurrency when value is provided", async () => {
    const { stdout } = await runCLI(`--input ${tempDir} -c 8 -f`);
    expect(stdout).toContain("✅ Files aggregated successfully");
    expect(stdout).toContain("🔄 Using concurrent processing with 8 workers");
    
    // Verify all files were processed
    const codebasePath = path.join(tempDir, "codebase.md");
    const content = await fs.readFile(codebasePath, "utf-8");
    for (let i = 1; i <= 10; i++) {
      expect(content).toContain(`test${i}.txt`);
    }
  });
});
});
