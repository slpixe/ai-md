import path from "path";
import { createMicromatchFilter } from "./micromatchUtils.js";
import type { Ignore } from 'ignore';

interface TestResult {
  ignored: boolean;
  unignored: boolean;
  pattern: string | null;
}

/**
 * Create an ignore filter function from an array of patterns.
 * This function uses micromatch for more powerful glob pattern matching.
 *
 * @param {string[]} patterns - The user provided ignore patterns.
 * @param {string} source - A descriptor for logging purposes.
 * @returns {Ignore} An instance of the ignore filter with compatible interface.
 */
export function createIgnoreFilter(patterns: string[], source: string): Ignore {
  const filterFn = createMicromatchFilter(patterns);
  
  // Create an object that matches the Ignore interface
  return {
    ignores: (filePath: string): boolean => filterFn(filePath),
    add: () => {
      return {} as Ignore;
    },
    filter: (items: string[]): string[] => {
      return items.filter(item => !filterFn(item));
    },
    createFilter: () => {
      return (item: string) => !filterFn(item);
    },
    test: (item: string): TestResult => {
      return {
        ignored: filterFn(item),
        unignored: !filterFn(item),
        pattern: patterns.find(p => filterFn(item)) || null
      };
    },
    checkIgnore: (pathname: string): TestResult => {
      return {
        ignored: filterFn(pathname),
        unignored: !filterFn(pathname),
        pattern: patterns.find(p => filterFn(pathname)) || null
      };
    }
  };
}

/**
 * Utility function to normalize file paths to use forward slashes.
 * This is used before applying ignore filters.
 *
 * @param {string} filePath - The file path to normalize.
 * @returns {string} The normalized file path.
 */
export function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}
