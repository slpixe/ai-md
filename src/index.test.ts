import { describe, it, expect } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from 'fs/promises';
import os from 'os';
import {ExecOptions} from "node:child_process";

const execAsync = promisify(exec);

async function runCLI(args: string = "", opts: ExecOptions = {}) {
  const cliPath = path.resolve(__dirname, "index.ts");
  return execAsync(`tsx ${cliPath} ${args}`, opts);
}

describe("AI Digest CLI", () => {
  it("should generate codebase.md by default", async () => {
    const { stdout } = await runCLI();
    expect(stdout).toMatch(/Files aggregated successfully into .*codebase\.md/);
  }, 10000);

  it("should respect custom output file", async () => {
    const { stdout } = await runCLI("-o custom_output.md");
    expect(stdout).toMatch(/Files aggregated successfully into .*custom_output\.md/);
  }, 10000);
});