export type TextToolCategory = 'process' | 'transform';

export type TextProcessMode =
  | 'dedupe'
  | 'sort'
  | 'replace'
  | 'split'
  | 'merge'
  | 'trimWhitespace'
  | 'lineNumbers';

export type TextTransformMode =
  | 'letterCase'
  | 'namingStyle'
  | 'fullHalfWidth'
  | 'newline';

export type TextSortMethod = 'lexicographic' | 'natural';
export type TextSortDirection = 'asc' | 'desc';
export type TextSplitMode = 'byLinesPerChunk' | 'byChunkCount';
export type TextMergeDelimiterMode = 'none' | 'newline' | 'custom';
export type LineNumberOperation = 'add' | 'remove' | 'renumber';
export type LetterCaseMode = 'upper' | 'lower' | 'title' | 'sentence' | 'invert';
export type NamingStyleMode = 'camelCase' | 'pascalCase' | 'snake_case' | 'kebab-case' | 'SCREAMING_SNAKE_CASE';
export type FullHalfWidthMode = 'fullToHalf' | 'halfToFull';
export type NewlineMode = 'lf' | 'crlf' | 'cr';

export interface TextSortConfig {
  method: TextSortMethod;
  direction: TextSortDirection;
  ignoreCase: boolean;
}

export interface TextReplaceConfig {
  find: string;
  replaceWith: string;
  useRegex: boolean;
  replaceAll: boolean;
  ignoreCase: boolean;
}

export interface TextSplitConfig {
  mode: TextSplitMode;
  count: number;
}

export interface TextMergeConfig {
  delimiterMode: TextMergeDelimiterMode;
  customDelimiter: string;
}

export interface TextTrimWhitespaceConfig {
  trimLineStartEnd: boolean;
  removeTrailingWhitespace: boolean;
  removeEmptyLines: boolean;
  collapseBlankLines: boolean;
}

export interface TextLineNumbersConfig {
  operation: LineNumberOperation;
  start: number;
  step: number;
  separator: string;
}

export interface TextLetterCaseConfig {
  mode: LetterCaseMode;
}

export interface TextNamingStyleConfig {
  mode: NamingStyleMode;
}

export interface TextFullHalfWidthConfig {
  mode: FullHalfWidthMode;
}

export interface TextNewlineConfig {
  mode: NewlineMode;
}

export interface TextToolStats {
  inputChars: number;
  outputChars: number;
  inputLines: number;
  outputLines: number;
  chunks?: number;
}

export interface TextToolResult {
  output: string;
  errorMessage?: string;
  stats: TextToolStats;
}
