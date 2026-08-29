export interface FileObject {
  cwd: string;
  file: string;
}

export type PathFilter = (filePath: string) => boolean;

export interface AggregateOptions {
  inputPaths?: string[];
  outputFile?: string;
  useDefaultIgnores?: boolean;
  removeWhitespace?: boolean;
  showFiles?: boolean;
  ignoreFilePath?: string;
  concurrency?: number;
  dryRun?: boolean;
  ignorePatterns?: string[];
  showTokens?: boolean;
  stdout?: boolean;
  maxTokens?: number;
}

export interface FileTokenInfo {
  path: string;
  tokenCount: number;
  percentage: number;
}

export interface ProcessFileResult {
  displayPath: string;
  snippet: string;
  wasIncluded: boolean;
  defaultIgnored: boolean;
  customIgnored: boolean;
  isBinaryOrSvg: boolean;
}
