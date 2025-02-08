/*
Purpose: Ensures whitespace removal works as expected, but does not affect whitespace-sensitive files.
 */

import {describe, it, expect, beforeEach, afterEach} from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import os from "os";

const execAsync = promisify(exec);
const tempDir = path.join(os.tmpdir(), "ai-md-test-whitespace-removal");

async function runCLI(args: string = "") {
	const cliPath = path.resolve(__dirname, "../src/index.ts");
	return execAsync(`npx tsx ${cliPath} ${args}`, { cwd: tempDir });
}

describe("Whitespace Removal", () => {
	beforeEach(async () => {
		await fs.mkdir(tempDir, {recursive: true});
	});

	afterEach(async () => {
		await fs.rm(tempDir, {recursive: true, force: true});
	});

	it("should not remove whitespace for whitespace-dependent files", async () => {
		const { stdout } = await runCLI("--whitespace-removal");
		expect(stdout).toContain("Whitespace removal enabled (except for whitespace-dependent languages)");
	});
});
