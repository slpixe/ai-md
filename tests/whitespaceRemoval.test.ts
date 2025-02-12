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
    const cliPath = path.resolve(__dirname, "../src/cli.ts");
    return execAsync(`npx tsx ${cliPath} ${args}`, { cwd: tempDir });
}

describe("Whitespace Removal", () => {
    beforeEach(async () => {
        await fs.mkdir(tempDir, {recursive: true});
        
        // Create test files with whitespace
        await fs.writeFile(
            path.join(tempDir, "test.txt"),
            "  This has   extra   whitespace  \n  And multiple lines  \n"
        );
    });

    afterEach(async () => {
        await fs.rm(tempDir, {recursive: true, force: true});
    });

    it("should remove whitespace by default", async () => {
        const outputPath = path.join(tempDir, "output.md");
        await runCLI(`-i test.txt -o output.md`);
        
        const output = await fs.readFile(outputPath, "utf-8");
        expect(output).toContain("```txt\nThis has extra whitespace");
        expect(output).toContain("And multiple lines");
        expect(output).not.toContain("  This has   extra   whitespace  ");
    });

    it("should preserve whitespace when -w flag is used", async () => {
        const outputPath = path.join(tempDir, "output-preserved.md");
        await runCLI(`-i test.txt -o output-preserved.md -w`);
        
        const output = await fs.readFile(outputPath, "utf-8");
        expect(output).toContain("  This has   extra   whitespace  ");
        expect(output).toContain("  And multiple lines  ");
    });

    it("should preserve whitespace when --keep-whitespace flag is used", async () => {
        const outputPath = path.join(tempDir, "output-preserved-long.md");
        await runCLI(`-i test.txt -o output-preserved-long.md --keep-whitespace`);
        
        const output = await fs.readFile(outputPath, "utf-8");
        expect(output).toContain("  This has   extra   whitespace  ");
        expect(output).toContain("  And multiple lines  ");
    });

    it("should not remove whitespace for whitespace-dependent files", async () => {
        // Create a Python file with significant indentation
        const pythonContent = "def test():\n    return True\n";
        await fs.writeFile(path.join(tempDir, "test.py"), pythonContent);
        
        const outputPath = path.join(tempDir, "output-python.md");
        await runCLI(`-i test.py -o output-python.md`);
        
        const output = await fs.readFile(outputPath, "utf-8");
        expect(output).toContain("    return True");  // Indentation preserved
    });

    it("should show appropriate message about whitespace handling", async () => {
        const { stdout: defaultOutput } = await runCLI("-i test.txt");
        expect(defaultOutput).toContain("Whitespace removal enabled");

        const { stdout: preservedOutput } = await runCLI("-i test.txt -w");
        expect(preservedOutput).toContain("Whitespace removal disabled");
    });
});
