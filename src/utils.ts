import { isBinaryFile } from "isbinaryfile";
import { encodingForModel } from "js-tiktoken";
import path from 'path';
import winston from 'winston';
import ignore, { type Ignore } from 'ignore';

// Create a logger instance with dynamic log level
export function createLogger(verbose: boolean = false) {
  return winston.createLogger({
    level: verbose ? 'debug' : 'info',
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
    ),
    transports: [new winston.transports.Console()]
  });
}

// Global logger instance
export const logger = createLogger();

// Function to update logger level
export function updateLoggerLevel(verbose: boolean) {
  logger.level = verbose ? 'debug' : 'info';
}

export const WHITESPACE_DEPENDENT_EXTENSIONS = [
  ".py", // Python
  ".yaml", // YAML
  ".yml", // YAML
  ".jade", // Jade/Pug
  ".haml", // Haml
  ".slim", // Slim
  ".coffee", // CoffeeScript
  ".pug", // Pug
  ".styl", // Stylus
  ".gd", // Godot
];

export const DEFAULT_IGNORES = [
  // Node.js
  "node_modules",
  "package-lock.json",
  "npm-debug.log",
  // Yarn
  "yarn.lock",
  "yarn-error.log",
  // pnpm
  "pnpm-lock.yaml",
  // Bun
  "bun.lockb",
  // Deno
  "deno.lock",
  // PHP (Composer)
  "vendor",
  "composer.lock",
  // Python
  "__pycache__",
  "*.pyc",
  "*.pyo",
  "*.pyd",
  ".Python",
  "pip-log.txt",
  "pip-delete-this-directory.txt",
  ".venv",
  "venv",
  "ENV",
  "env",
  // Godot
  ".godot",
  "*.import",
  // Ruby
  "Gemfile.lock",
  ".bundle",
  // Java
  "target",
  "*.class",
  // Gradle
  ".gradle",
  "build",
  // Maven
  "pom.xml.tag",
  "pom.xml.releaseBackup",
  "pom.xml.versionsBackup",
  "pom.xml.next",
  // .NET
  "bin",
  "obj",
  "*.suo",
  "*.user",
  // Go
  "go.sum",
  // Rust
  "Cargo.lock",
  "target",
  // General
  ".git",
  ".svn",
  ".hg",
  ".DS_Store",
  "Thumbs.db",
  // Environment variables
  ".env",
  ".env.local",
  ".env.development.local",
  ".env.test.local",
  ".env.production.local",
  "*.env",
  "*.env.*",
  // Common framework directories
  ".svelte-kit",
  ".next",
  ".nuxt",
  ".vuepress",
  ".cache",
  "dist",
  "tmp",
  // Our output file
  "codebase.md",
  // Turborepo cache folder
  ".turbo",
  ".vercel",
  ".netlify",
  "LICENSE",
];

export function removeWhitespace(val: string): string {
  logger.debug(`Removing whitespace from content of length ${val.length}`);
  return val.replace(/\s+/g, " ").trim();
}

export function escapeTripleBackticks(content: string): string {
  logger.debug(`Escaping triple backticks in content of length ${content.length}`);
  return content.replace(/\`\`\`/g, "\\`\\`\\`");
}

export function createIgnoreFilter(ignorePatterns: string[], ignoreFile: string): Ignore {
  logger.debug(`Creating ignore filter with ${ignorePatterns.length} patterns from ${ignoreFile}`);
  return ignore().add(ignorePatterns);
}

export async function estimateTokenCount(text: string): Promise<number> {
  try {
    logger.debug('Estimating token count...');
    const { encodingForModel } = await import('js-tiktoken');
    const enc = encodingForModel("gpt-4o");
    const count = enc.encode(text).length;
    logger.debug(`Estimated ${count} tokens for text of length ${text.length}`);
    return count;
  } catch (error) {
    logger.error("Error estimating token count:", error);
    return 0;
  }
}

export async function isTextFile(filePath: string): Promise<boolean> {
  try {
    logger.debug(`Checking if file is text: ${filePath}`);
    const isBinary = await isBinaryFile(filePath);
    const result = !isBinary && !filePath.toLowerCase().endsWith('.svg');
    logger.debug(`File ${filePath} is ${result ? 'text' : 'non-text'}`);
    return result;
  } catch (error) {
    logger.error(`Error checking if file is binary: ${filePath}`, error);
    return false;
  }
}

export function getFileType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  logger.debug(`Getting file type for extension: ${extension}`);
  
  switch (extension) {
    case '.jpg':
    case '.jpeg':
    case '.png':
    case '.gif':
    case '.bmp':
    case '.webp':
      return 'Image';
    case '.svg':
      return 'SVG Image';
    case '.wasm':
      return 'WebAssembly';
    case '.pdf':
      return 'PDF';
    case '.doc':
    case '.docx':
      return 'Word Document';
    case '.xls':
    case '.xlsx':
      return 'Excel Spreadsheet';
    case '.ppt':
    case '.pptx':
      return 'PowerPoint Presentation';
    case '.zip':
    case '.rar':
    case '.7z':
      return 'Compressed Archive';
    case '.exe':
      return 'Executable';
    case '.dll':
      return 'Dynamic-link Library';
    case '.so':
      return 'Shared Object';
    case '.dylib':
      return 'Dynamic Library';
    default:
      return 'Binary';
  }
}

export function shouldTreatAsBinary(filePath: string): boolean {
  logger.debug(`Checking if file should be treated as binary: ${filePath}`);
  return filePath.toLowerCase().endsWith('.svg') || getFileType(filePath) !== 'Binary';
}
