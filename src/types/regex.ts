export interface RegexFlags {
  g: boolean;
  i: boolean;
  m: boolean;
  s: boolean;
  u: boolean;
  y: boolean;
}

export interface RegexGroupItem {
  index: number;
  value: string;
}

export interface RegexMatchItem {
  index: number;
  match: string;
  start: number;
  end: number;
  groups: RegexGroupItem[];
}

export interface RegexTestResult {
  isValid: boolean;
  errorMessage?: string;
  flags: string;
  matches: RegexMatchItem[];
}

export interface RegexReplaceResult {
  output: string;
}

export const DEFAULT_REGEX_FLAGS: RegexFlags = {
  g: true,
  i: false,
  m: false,
  s: false,
  u: false,
  y: false,
};

export const REGEX_TEST_EXAMPLE = {
  pattern: "(https?)://([^/\\s]+)(/[^\\s]*)?",
  replacement: "$2",
  input: `访问链接：
https://deskforge.dev/docs/start
http://localhost:3000/api/status
`,
};
