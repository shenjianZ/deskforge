/**
 * 代码格式化相关类型定义
 */

/**
 * 支持的编程语言
 */
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
 * 代码格式化配置
 */
export interface CodeFormatConfig {
  /** 编程语言 */
  language: CodeLanguage;
  /** 缩进空格数（默认 4） */
  indent?: number;
  /** 使用 Tab 缩进 */
  useTabs?: boolean;
  /** 格式化模式 */
  mode?: FormatMode;
}

/**
 * 代码格式化模式
 */
export type FormatMode = 'pretty' | 'compact';

/**
 * 代码格式化结果
 */
export interface CodeFormatResult {
  /** 是否成功 */
  success: boolean;
  /** 格式化后的代码字符串 */
  result: string;
  /** 错误信息（如果失败） */
  error?: string;
}

/**
 * 代码验证结果
 */
export interface CodeValidateResult {
  /** 是否有效的代码 */
  isValid: boolean;
  /** 错误信息（如果无效） */
  errorMessage?: string;
  /** 错误位置（行号，从 1 开始） */
  errorLine?: number;
}
