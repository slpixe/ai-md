/*
Purpose: Ensures that default ignores, .aidigestignore, and --no-default-ignores work correctly.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs/promises";
import { runCli } from './helpers/runCli.js';
import { createTempDir } from './helpers/tempDir.js';

let tempDir: string;
let ignoreFilePath: string;

async function runCLI(args: string = "") {
	return runCli(tempDir, args);
}

describe("Ignore Behavior", () => {
	beforeEach(async () => {
		tempDir = await createTempDir('ai-md-test-ignore-behavior');
		ignoreFilePath = path.join(tempDir, '.aidigestignore');
		await fs.writeFile(ignoreFilePath, "*.log\nnode_modules");
	});

	afterEach(async () => {
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	it("should disable default ignores when flag is set", async () => {
		const { stdout } = await runCLI("--no-default-ignores");
		expect(stdout).toContain("🛠️ Custom ignore patterns enabled.");
	});

	it("should respect custom ignore file", async () => {
		const testFile = path.join(tempDir, "test.log");
		await fs.writeFile(testFile, "log content");
		const { stdout } = await runCLI();
		expect(stdout).not.toContain("test.log");
	});

	it("should exclude common credential files by default", async () => {
		await fs.writeFile(path.join(tempDir, ".npmrc"), "//registry.npmjs.org/:_authToken=secret");
		await fs.writeFile(path.join(tempDir, "private.pem"), "private material");
		await fs.writeFile(path.join(tempDir, "safe.txt"), "safe content");

		await runCLI();
		const output = await fs.readFile(path.join(tempDir, "codebase.md"), "utf8");
		expect(output).toContain("safe content");
		expect(output).not.toContain("secret");
		expect(output).not.toContain("private material");
	});
});
