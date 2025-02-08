import { describe, it, beforeAll } from 'vitest';
import { performance } from 'node:perf_hooks';
import { encode } from 'gpt-tokenizer';

// Test texts of different sizes
const smallText = "Hello, world! This is a small test.";
const mediumText = Array(100).fill("This is a medium sized test with some repetition. ").join("");
const largeText = Array(1000).fill("This is a larger test with more content to process. Let's see how it performs. ").join("");

interface BenchmarkResult {
  encodeTime: number;
  tokenCount: number;
}

function benchmarkGptTokenizer(text: string): BenchmarkResult {
  const encodeStart = performance.now();
  const tokens = encode(text);
  const encodeTime = performance.now() - encodeStart;

  return {
    encodeTime,
    tokenCount: tokens.length
  };
}

function runBenchmark(text: string, iterations: number = 5) {
  console.log(`\nBenchmarking text of length: ${text.length} characters`);
  console.log("-".repeat(50));

  // Warm-up run
  benchmarkGptTokenizer(smallText);

  // Benchmark runs
  const results: BenchmarkResult[] = [];

  for (let i = 0; i < iterations; i++) {
    results.push(benchmarkGptTokenizer(text));
  }

  // Calculate averages
  const avg = {
    encodeTime: results.reduce((sum, r) => sum + r.encodeTime, 0) / iterations,
    tokenCount: results[0].tokenCount
  };

  console.log("gpt-tokenizer results:");
  console.log(`  Encode time: ${avg.encodeTime.toFixed(2)}ms`);
  console.log(`  Token count: ${avg.tokenCount}`);

  return avg;
}

describe('Tokenizer Benchmark', () => {
  it('should benchmark small text', () => {
    runBenchmark(smallText);
  });

  it('should benchmark medium text', () => {
    runBenchmark(mediumText);
  });

  it('should benchmark large text', () => {
    runBenchmark(largeText);
  });
});
