/*
Purpose: Covers fundamental behaviors like default
output, custom output files, and respecting the --input flag.
*/

import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {exec} from "child_process";
import {promisify} from "util";
import path from "path";
import fs from "fs/promises";
import os from "os";
import {ExecOptions} from "node:child_process";

const execAsync = promisify(exec);
const tempDir = path.join(os.tmpdir(), "ai-txt-test");

async function runCLI(args: string = "", opts: ExecOptions = {}) {
	const cliPath = path.resolve(__dirname, "../src/index.ts");
	return execAsync(`npx tsx ${cliPath} ${args}`, {...opts, cwd: tempDir});
}

describe("Basic Behavior", () => {
	beforeEach(async () => {
		await fs.mkdir(tempDir, {recursive: true});
	});

	afterEach(async () => {
		await fs.rm(tempDir, {recursive: true, force: true});
	});

	it("should generate codebase.md by default", async () => {
		const {stdout} = await runCLI();
		expect(stdout).toMatch(/Files aggregated successfully into .*codebase\.md/);
	});

	it("should respect custom output file", async () => {
		const {stdout} = await runCLI("-o custom_output.md");
		expect(stdout).toMatch(/Files aggregated successfully into .*custom_output\.md/);
	});

	it("should respect the --input flag", async () => {
		const testFile = path.join(tempDir, "test.txt");
		await fs.writeFile(testFile, "Test content");
		const {stdout} = await runCLI(`--input ${tempDir} --show-output-files`);
		expect(stdout).toContain("test.txt");
	});
});
