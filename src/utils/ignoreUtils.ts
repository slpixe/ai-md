// src/utils/ignoreUtils.ts

import ignore, { type Ignore } from 'ignore';
import { logger } from './logger.js';

/**
 * Creates an ignore filter with given patterns.
 * @param ignorePatterns - Array of ignore patterns.
 * @param ignoreFile - Name of the ignore file (for logging purposes).
 * @returns An Ignore instance with the patterns added.
 */
export function createIgnoreFilter(ignorePatterns: string[], ignoreFile: string): Ignore {
	logger.debug(`Creating ignore filter with ${ignorePatterns.length} patterns from ${ignoreFile}`);
	const ig = ignore();
	ig.add(ignorePatterns);
	return ig;
}
