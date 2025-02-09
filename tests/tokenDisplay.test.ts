import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import os from "os";

const execAsync = promisify(exec);
const tempDir = path.join(os.tmpdir(), "ai-md-test-token-display");

async function runCLI(args: string = "") {
  const cliPath = path.resolve(__dirname, "../src/cli.ts");
  return execAsync(`npx tsx ${cliPath} ${args}`, { cwd: tempDir });
}

describe("Token Display", () => {
  beforeEach(async () => {
    await fs.mkdir(tempDir, { recursive: true });
    
    // Create test files with known content
    await fs.writeFile(
      path.join(tempDir, "small.txt"),
      "This is a small test file."
    );
    
    await fs.writeFile(
      path.join(tempDir, "medium.txt"),
      "This is a medium file.\n".repeat(10)
    );
    
    await fs.writeFile(
      path.join(tempDir, "large.txt"),
      "This is a larger test file with more content.\n".repeat(20)
    );

    // Create a binary file
    await fs.writeFile(
      path.join(tempDir, "test.bin"),
      Buffer.from([0x00, 0x01, 0x02, 0x03])
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should show token counts and percentages", async () => {
    const { stdout } = await runCLI("--show-tokens");
    
    // Verify token analysis table is present
    expect(stdout).toContain("📊 Token analysis:");
    expect(stdout).toContain("tokens");
    expect(stdout).toContain("%");
    
    // Verify all files are included
    expect(stdout).toContain("small.txt");
    expect(stdout).toContain("medium.txt");
    expect(stdout).toContain("large.txt");
    expect(stdout).toContain("test.bin");
    
    // Verify token counts are present and ordered
    const lines = stdout.split("\n");
    // Only count lines that show individual file token counts (exclude header/total)
    const tokenLines = lines.filter(line => line.includes("tokens") && line.includes("%"));
    expect(tokenLines.length).toBe(4); // All 4 files should have token counts
    
    // Extract token counts and verify they're in descending order
    const tokenCounts = tokenLines.map(line => {
      const match = line.match(/(\d+) tokens/);
      return match ? parseInt(match[1]) : 0;
    });
    
    const sortedTokenCounts = [...tokenCounts].sort((a, b) => b - a);
    expect(tokenCounts).toEqual(sortedTokenCounts);
    
    // Verify percentages add up to approximately 100%
    const percentages = tokenLines.map(line => {
      const match = line.match(/(\d+\.?\d*)\%/);
      return match ? parseFloat(match[1]) : 0;
    });
    
    const totalPercentage = percentages.reduce((sum, p) => sum + p, 0);
    expect(totalPercentage).toBeCloseTo(100, 1); // Allow for minor floating point differences
  });

  it("should handle empty files", async () => {
    await fs.writeFile(path.join(tempDir, "empty.txt"), "");
    const { stdout } = await runCLI("--show-tokens");
    
    expect(stdout).toContain("empty.txt");
    expect(stdout).toMatch(/empty\.txt.*0 tokens/);
  });

  it("should show fixed token count for binary files", async () => {
    const { stdout } = await runCLI("--show-tokens");
    expect(stdout).toMatch(/test\.bin.*10 tokens/); // Binary files get 10 tokens
  });

  it("should not show token analysis without --show-tokens flag", async () => {
    const { stdout } = await runCLI();
    expect(stdout).not.toContain("📊 Token analysis:");
    expect(stdout).not.toContain("tokens");
  });
});
