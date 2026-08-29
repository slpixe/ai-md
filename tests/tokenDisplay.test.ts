import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs/promises";
import { runCli } from './helpers/runCli.js';
import { createTempDir } from './helpers/tempDir.js';

let tempDir: string;

async function runCLI(args: string = "") {
  return runCli(tempDir, args);
}

describe("Token Display", () => {
  beforeEach(async () => {
    tempDir = await createTempDir('ai-md-test-token-display');
    
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
      const match = line.match(/(\d+\.?\d*)%/);
      return match ? parseFloat(match[1]) : 0;
    });
    
    const totalPercentage = percentages.reduce((sum, p) => sum + p, 0);
    expect(Math.abs(totalPercentage - 100)).toBeLessThanOrEqual(0.2); // One-decimal display rounding
  });

  it("should include Markdown framing in the estimate for empty files", async () => {
    await fs.writeFile(path.join(tempDir, "empty.txt"), "");
    const { stdout } = await runCLI("--show-tokens");
    
    expect(stdout).toContain("empty.txt");
    expect(stdout).toMatch(/empty\.txt.*[1-9]\d* tokens/);
  });

  it("should estimate the generated Markdown snippet for binary files", async () => {
    const { stdout } = await runCLI("--show-tokens");
    expect(stdout).toMatch(/test\.bin.*\d+ tokens/);
  });

  it("should not show token analysis without --show-tokens flag", async () => {
    const { stdout } = await runCLI();
    expect(stdout).not.toContain("📊 Token analysis:");
    expect(stdout).not.toContain("tokens");
  });

  it("should handle a directory with no included files", async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(tempDir, { recursive: true });

    const { stdout } = await runCLI("--show-tokens");
    expect(stdout).toContain("No included files to analyze.");
  });
});
