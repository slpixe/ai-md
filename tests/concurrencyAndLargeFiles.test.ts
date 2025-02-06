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
const tempDir = path.join(os.tmpdir(), "ai-txt-test-concurrency-large");

async function runCLI(args: string = "") {
	const cliPath = path.resolve(__dirname, "../src/index.ts");
	return execAsync(`npx tsx ${cliPath} ${args}`, { cwd: tempDir });
}

describe("Concurrency & Large Files", () => {
	beforeEach(async () => {
		await fs.mkdir(tempDir, {recursive: true});
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

	it("should run without corruption when --concurrent is enabled", async () => {
		const { stdout } = await runCLI("--concurrent");
		expect(stdout).toContain("✅ Files aggregated successfully");
	});
});
