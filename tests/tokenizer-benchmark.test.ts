import { describe, it, beforeAll } from 'vitest';
import { performance } from 'node:perf_hooks';
import { encodingForModel } from 'js-tiktoken';
import { encode } from 'gpt-tokenizer';

// Test texts of different sizes
const smallText = "Hello, world! This is a small test.";
const mediumText = Array(100).fill("This is a medium sized test with some repetition. ").join("");
const largeText = Array(1000).fill("This is a larger test with more content to process. Let's see how it performs. ").join("");

interface BenchmarkResult {
  initTime: number;
  encodeTime: number;
  tokenCount: number;
}

async function benchmarkTiktoken(text: string): Promise<BenchmarkResult> {
  const initStart = performance.now();
  const enc = encodingForModel("gpt-4");
  const initTime = performance.now() - initStart;

  const encodeStart = performance.now();
  const tokens = enc.encode(text);
  const encodeTime = performance.now() - encodeStart;

  return {
    initTime,
    encodeTime,
    tokenCount: tokens.length
  };
}

function benchmarkGptTokenizer(text: string): BenchmarkResult {
  const initStart = performance.now();
  const initTime = performance.now() - initStart;

  const encodeStart = performance.now();
  const tokens = encode(text);
  const encodeTime = performance.now() - encodeStart;

  return {
    initTime,
    encodeTime,
    tokenCount: tokens.length
  };
}

async function runBenchmark(text: string, iterations: number = 5) {
  console.log(`\nBenchmarking text of length: ${text.length} characters`);
  console.log("-".repeat(50));

  // Warm-up run
  await benchmarkTiktoken(smallText);
  await benchmarkGptTokenizer(smallText);

  // Benchmark runs
  const tiktokenResults: BenchmarkResult[] = [];
  const gptTokenizerResults: BenchmarkResult[] = [];

  for (let i = 0; i < iterations; i++) {
    tiktokenResults.push(await benchmarkTiktoken(text));
    gptTokenizerResults.push(await benchmarkGptTokenizer(text));
  }

  // Calculate averages
  const tiktokenAvg = {
    initTime: tiktokenResults.reduce((sum, r) => sum + r.initTime, 0) / iterations,
    encodeTime: tiktokenResults.reduce((sum, r) => sum + r.encodeTime, 0) / iterations,
    tokenCount: tiktokenResults[0].tokenCount
  };

  const gptTokenizerAvg = {
    initTime: gptTokenizerResults.reduce((sum, r) => sum + r.initTime, 0) / iterations,
    encodeTime: gptTokenizerResults.reduce((sum, r) => sum + r.encodeTime, 0) / iterations,
    tokenCount: gptTokenizerResults[0].tokenCount
  };

  console.log("js-tiktoken results:");
  console.log(`  Init time: ${tiktokenAvg.initTime.toFixed(2)}ms`);
  console.log(`  Encode time: ${tiktokenAvg.encodeTime.toFixed(2)}ms`);
  console.log(`  Token count: ${tiktokenAvg.tokenCount}`);

  console.log("\ngpt-tokenizer results:");
  console.log(`  Init time: ${gptTokenizerAvg.initTime.toFixed(2)}ms`);
  console.log(`  Encode time: ${gptTokenizerAvg.encodeTime.toFixed(2)}ms`);
  console.log(`  Token count: ${gptTokenizerAvg.tokenCount}`);

  return { tiktokenAvg, gptTokenizerAvg };
}

describe('Tokenizer Benchmark', () => {
  beforeAll(() => {
    // No initialization needed for gpt-tokenizer
  });

  it('should benchmark small text', async () => {
    await runBenchmark(smallText);
  });

  it('should benchmark medium text', async () => {
    await runBenchmark(mediumText);
  });

  it('should benchmark large text', async () => {
    await runBenchmark(largeText);
  });
});
