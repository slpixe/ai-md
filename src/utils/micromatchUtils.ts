import micromatch from "micromatch";
import path from "path";

/**
 * Enhances a pattern to match directory contents if it's a directory pattern
 *
 * @param pattern - The pattern to enhance
 * @returns Array of enhanced patterns
 */
function enhanceDirectoryPattern(pattern: string): string[] {
  return [
    pattern,
    `${pattern}/**`,
    `**/${pattern}/**`,
    `**/${pattern}`
  ];
}

/**
 * Checks if a file matches a pattern, handling both directory and file patterns
 *
 * @param file - The file path to check
 * @param pattern - The pattern to match against
 * @returns Whether the file matches the pattern
 */
function matchesPattern(file: string, pattern: string): boolean {
  // For directory patterns without glob characters
  if (!micromatch.scan(pattern).isGlob && !path.extname(pattern)) {
    return micromatch.isMatch(file, enhanceDirectoryPattern(pattern));
  }

  // For file patterns or existing glob patterns
  const patterns = pattern.includes("*") ? 
    [pattern] : 
    [`**/${pattern}`, pattern];
  
  return micromatch.isMatch(file, patterns);
}

/**
 * Filters an array of files based on include and exclude patterns.
 * Include patterns take precedence over exclude patterns.
 *
 * @param files - Array of file paths to filter
 * @param includePatterns - Optional array of glob patterns to include
 * @param excludePatterns - Optional array of glob patterns to exclude
 * @returns Filtered array of file paths
 */
export function filterFiles(
  files: string[],
  includePatterns?: string[],
  excludePatterns?: string[]
): string[] {
  // Normalize all patterns to use forward slashes
  const normalizedIncludes = includePatterns?.map(p => p.replace(/\\/g, "/"));
  const normalizedExcludes = excludePatterns?.map(p => p.replace(/\\/g, "/"));

  return files.filter(file => {
    // Normalize the file path to use forward slashes
    const normalizedFile = file.replace(/\\/g, "/");

    // If exclude patterns exist and file matches any, exclude it
    if (normalizedExcludes?.length) {
      if (normalizedExcludes.some(pattern => 
        matchesPattern(normalizedFile, pattern))) {
        return false;
      }
    }

    // If include patterns exist, file must match at least one
    if (normalizedIncludes?.length) {
      return normalizedIncludes.some(pattern => 
        matchesPattern(normalizedFile, pattern));
    }

    // If no include patterns, include everything not excluded
    return true;
  });
}

/**
 * Creates a filter function based on provided glob patterns.
 * Similar to ignore.createFilter but using micromatch for better glob support.
 *
 * @param patterns - Array of glob patterns
 * @returns Function that tests if a file path matches the patterns
 */
export function createMicromatchFilter(patterns: string[]): (file: string) => boolean {
  const normalizedPatterns = patterns.map(pattern => {
    // Normalize pattern to use forward slashes
    const normPattern = pattern.replace(/\\/g, "/").trim();

    // If pattern doesn't contain glob characters and doesn't have an extension
    if (!micromatch.scan(normPattern).isGlob && !path.extname(normPattern)) {
      return enhanceDirectoryPattern(normPattern);
    }

    // For file patterns or existing glob patterns, ensure they can match anywhere
    return normPattern.startsWith("**") ? normPattern : `**/${normPattern}`;
  }).flat();

  // Return a function that tests paths against the processed patterns
  return (file: string): boolean => {
    const normalizedFile = file.replace(/\\/g, "/");
    return micromatch.isMatch(normalizedFile, normalizedPatterns);
  };
}