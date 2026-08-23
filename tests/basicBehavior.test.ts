/*
Purpose: Covers fundamental behaviors like default
output, custom output files, and respecting the --input flag.
*/

import {afterEach, beforeEach, describe, expect, it} from "vitest";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { runCli } from './helpers/runCli.js';

const tempDir = path.join(os.tmpdir(), "ai-md-test");

async function runCLI(args: string = "") {
	return runCli(tempDir, args);
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
		const {stdout} = await runCLI(`--input ${tempDir} --show-files`);
		expect(stdout).toContain("test.txt");
	});

	it("should report the package version", async () => {
		const {version} = JSON.parse(
			await fs.readFile(new URL("../package.json", import.meta.url), "utf8"),
		) as {version: string};
		const {stdout} = await runCLI("--version");
		expect(stdout.trim()).toBe(version);
	});
});
