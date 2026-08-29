import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { aggregateFiles } from '../src/aggregator/aggregateFiles.js';
import { gatherFiles } from '../src/aggregator/gatherFiles.js';
import { createCli } from '../src/cli.js';
import { createTempDir } from './helpers/tempDir.js';

let tempDir: string;

describe('Library behavior', () => {
  beforeEach(async () => {
    tempDir = await createTempDir('ai-md-test-library');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('can be imported and configured without executing the CLI', () => {
    const command = createCli();
    expect(command.name()).toBe('ai-md');
  });

  it('deduplicates overlapping inputs', async () => {
    const file = path.join(tempDir, 'file.txt');
    await fs.writeFile(file, 'content');

    const gathered = await gatherFiles([file, file]);

    expect(gathered).toHaveLength(1);
  });

  it('prunes ignored directories during traversal', async () => {
    await fs.mkdir(path.join(tempDir, 'node_modules', 'package'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'node_modules', 'package', 'index.js'), 'ignored');
    await fs.writeFile(path.join(tempDir, 'included.js'), 'included');

    const gathered = await gatherFiles([tempDir], { traversalIgnorePatterns: ['node_modules'] });

    expect(gathered.map((file) => file.file)).toEqual([`${path.basename(tempDir)}/included.js`]);
  });

  it('supports the options-object API and writes duplicate inputs once', async () => {
    const inputFile = path.join(tempDir, 'input.txt');
    const outputFile = path.join(tempDir, 'result.md');
    await fs.writeFile(inputFile, 'library content');

    await aggregateFiles({
      inputPaths: [inputFile, inputFile],
      outputFile,
      ignoreFilePath: path.join(tempDir, '.aidigestignore'),
      removeWhitespace: false,
      concurrency: 2,
    });

    const output = await fs.readFile(outputFile, 'utf8');
    expect(output.match(/^# input\.txt$/gm)).toHaveLength(1);
    expect(output).toContain('library content');
  });

  it('validates programmatic numeric limits', async () => {
    await expect(aggregateFiles({ concurrency: 0 })).rejects.toThrow(/between 1 and 64/);
    await expect(aggregateFiles({ maxTokens: Number.MAX_SAFE_INTEGER })).rejects.toThrow(/between 1 and 10000000/);
  });
});
