/**
 * 语言映射和语法高亮工具函数
 */

// CodeFormatter 中的语言类型
export type CodeLanguage =
  | 'java'
  | 'cpp'
  | 'rust'
  | 'python'
  | 'sql'
  | 'javascript'
  | 'typescript'
  | 'html'
  | 'css'
  | 'json'
  | 'xml';

/**
 * 语言别名映射表
 * 将项目中的语言标识映射到 Highlight.js 支持的语言标识
 */
export const LANGUAGE_MAP: Record<CodeLanguage | string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  java: 'java',
  cpp: 'cpp',
  rust: 'rust',
  python: 'python',
  sql: 'sql',
  html: 'xml', // HTML 在 Highlight.js 中使用 xml 或 html
  css: 'css',
  json: 'json',
  xml: 'xml',

  // 额外的别名
  js: 'javascript',
  ts: 'typescript',
  cxx: 'cpp',
  py: 'python',
  yml: 'yaml',
} as const;

/**
 * 获取 Highlight.js 对应的语言标识
 */
export function getHighlightLanguage(language: string): string {
  return LANGUAGE_MAP[language] || language;
}

/**
 * 获取语言显示名称
 */
export function getLanguageDisplayName(language: string): string {
  const displayNames: Record<string, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    java: 'Java',
    cpp: 'C++',
    rust: 'Rust',
    python: 'Python',
    sql: 'SQL',
    html: 'HTML',
    css: 'CSS',
    json: 'JSON',
    xml: 'XML',
  };
  return displayNames[language] || language.toUpperCase();
}

/**
 * 检查语言是否支持高亮
 */
export function isSupportedLanguage(language: string): boolean {
  const supportedLanguages: CodeLanguage[] = [
    'javascript',
    'typescript',
    'java',
    'cpp',
    'rust',
    'python',
    'sql',
    'html',
    'css',
    'json',
    'xml',
  ];
  return supportedLanguages.includes(language as CodeLanguage);
}
