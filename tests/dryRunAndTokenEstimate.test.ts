import {describe, it, expect, beforeEach, afterEach} from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import os from "os";

const execAsync = promisify(exec);
const tempDir = path.join(os.tmpdir(), "ai-md-test-dry-token");

async function runCLI(args: string = "") {
	const cliPath = path.resolve(__dirname, "../src/cli.ts");
	return execAsync(`npx tsx ${cliPath} ${args}`, { cwd: tempDir });
}

describe("Dry Run & Token Estimation", () => {
	beforeEach(async () => {
		await fs.mkdir(tempDir, {recursive: true});
	});

	afterEach(async () => {
		await fs.rm(tempDir, {recursive: true, force: true});
	});

	it("should not write output in dry-run mode", async () => {
		await runCLI("--dry-run");
		expect(await fs.access(path.join(tempDir, "codebase.md")).catch(() => "missing")).toBe("missing");
	});

	it("should estimate token count for small files", async () => {
		const smallFile = path.join(tempDir, "small.txt");
		await fs.writeFile(smallFile, "Test content.");
		const { stdout } = await runCLI(`--input ${tempDir}`);
		expect(stdout).toMatch(/🔢 Estimated token count: \d+/);
	});
});
