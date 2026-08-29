import path from "path";
import { createMicromatchFilter } from "./micromatchUtils.js";
import type { PathFilter } from '../types/index.js';
import { logger } from './logger.js';

/**
 * Create a path predicate from an array of ignore patterns.
 *
 * @param {string[]} patterns - The user provided ignore patterns.
 * @param {string} source - A descriptor for logging purposes.
 * @returns A predicate that is true when a path should be ignored.
 */
export function createIgnoreFilter(patterns: string[], source: string): PathFilter {
  logger.debug(`Creating ignore filter for ${source}`);
  return createMicromatchFilter(patterns);
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
