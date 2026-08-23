/*
Purpose: Ensures large files are skipped properly, and concurrency does not cause corruption.
 */

import {describe, it, expect, beforeEach, afterEach} from "vitest";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { runCli } from './helpers/runCli.js';

const tempDir = path.join(os.tmpdir(), "ai-md-test-concurrency-large");

async function runCLI(args: string = "") {
	return runCli(tempDir, args);
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

		await runCLI(`--input ${tempDir}`);

		// Read the generated file instead
		const codebasePath = path.join(tempDir, "codebase.md");
		const content = await fs.readFile(codebasePath, "utf-8");

		expect(content).toContain("(This text file is > 5.0 MB, skipping content.)");
	});

	it("should stream output larger than the token-analysis limit", async () => {
		for (let index = 1; index <= 3; index += 1) {
			await fs.writeFile(path.join(tempDir, `stream-${index}.txt`), String(index).repeat(4 * 1024 * 1024));
		}

		const { stdout } = await runCLI(`--input ${tempDir} --concurrent 2`);
		const stats = await fs.stat(path.join(tempDir, "codebase.md"));

		expect(stats.size).toBeGreaterThan(10 * 1024 * 1024);
		expect(stdout).toContain("Token count estimation skipped due to large file size");
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

  it("should reject invalid concurrency values", async () => {
    await expect(runCLI("--concurrent 0")).rejects.toThrow(/between 1 and 64/);
    await expect(runCLI("--concurrent nope")).rejects.toThrow(/positive integer/);
  });
});
});
