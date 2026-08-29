/*
Purpose: Covers fundamental behaviors like default
output, custom output files, and respecting the --input flag.
*/

import {afterEach, beforeEach, describe, expect, it} from "vitest";
import path from "path";
import fs from "fs/promises";
import { runCli } from './helpers/runCli.js';
import { createTempDir } from './helpers/tempDir.js';

let tempDir: string;

async function runCLI(args: string = "") {
	return runCli(tempDir, args);
}

describe("Basic Behavior", () => {
	beforeEach(async () => {
		tempDir = await createTempDir('ai-md-test');
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

	it("should emit clean Markdown to stdout and diagnostics to stderr", async () => {
		await fs.writeFile(path.join(tempDir, 'test.txt'), 'Test content');

		const {stdout, stderr} = await runCLI('--stdout --input test.txt --keep-whitespace');

		expect(stdout).toBe('# test.txt\n\n```txt\nTest content\n```\n\n');
		expect(stderr).toContain('Files aggregated successfully to standard output');
		await expect(fs.access(path.join(tempDir, 'codebase.md'))).rejects.toThrow();
	});

	it("should enforce the estimated token budget", async () => {
		await fs.writeFile(path.join(tempDir, 'large.txt'), 'content '.repeat(100));

		const {stdout} = await runCLI('--input large.txt --max-tokens 1');
		const output = await fs.readFile(path.join(tempDir, 'codebase.md'), 'utf8');

		expect(output).toBe('');
		expect(stdout).toContain('Files skipped by token budget: 1');
		expect(stdout).toContain('Token budget: 0/1 estimated tokens');
	});

	it("should reject unsafe token limits and conflicting output modes", async () => {
		await expect(runCLI('--max-tokens 0')).rejects.toThrow(/between 1 and 10000000/);
		await expect(runCLI('--stdout --dry-run')).rejects.toThrow(/cannot be combined/);
		await expect(runCLI('--stdout --output result.md')).rejects.toThrow(/cannot be combined/);
	});
});
