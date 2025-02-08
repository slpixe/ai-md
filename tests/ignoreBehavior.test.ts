/*
Purpose: Ensures that default ignores, .aidigestignore, and --no-default-ignores work correctly.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import os from "os";

const execAsync = promisify(exec);
const tempDir = path.join(os.tmpdir(), "ai-md-test-ignore-behavior");
const ignoreFilePath = path.join(tempDir, ".aidigestignore");

async function runCLI(args: string = "") {
	const cliPath = path.resolve(__dirname, "../src/cli.ts");
	return execAsync(`npx tsx ${cliPath} ${args}`, { cwd: tempDir });
}

describe("Ignore Behavior", () => {
	beforeEach(async () => {
		await fs.mkdir(tempDir, { recursive: true });
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
});
