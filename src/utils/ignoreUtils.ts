import ignore, { Ignore } from "ignore";
import path from "path";

/**
 * Create an ignore filter function from an array of patterns.
 * This function normalizes the patterns and ensures that directory paths are handled.
 *
 * @param {string[]} patterns - The user provided ignore patterns.
 * @param {string} source - A descriptor for logging purposes.
 * @returns {Ignore} An instance of the ignore filter.
 */
export function createIgnoreFilter(patterns: string[], source: string): Ignore {
  const ignoreFilter = ignore();
  
  patterns.forEach(pattern => {
    // Normalize pattern: replace backslashes with forward slashes
    let normPattern = pattern.replace(/\\/g, "/").trim();
    
    // If pattern doesn't contain glob characters
    if (!/[*?[\]]/.test(normPattern)) {
      // For directory-like patterns (no file extension), ensure they match all contents
      if (!path.extname(normPattern)) {
        // Add multiple variants of the pattern to catch different path formats
        ignoreFilter.add([
          normPattern,           // exact match
          `${normPattern}/**`,   // all contents if it's a directory
          `**/${normPattern}`,   // match anywhere in path
          `**/${normPattern}/**` // match directory anywhere and its contents
        ]);
      } else {
        // For file patterns, match the file anywhere in the path
        ignoreFilter.add([
          normPattern,
          `**/${normPattern}`
        ]);
      }
    } else {
      // For glob patterns, use as-is
      ignoreFilter.add(normPattern);
    }
  });

  return ignoreFilter;
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
