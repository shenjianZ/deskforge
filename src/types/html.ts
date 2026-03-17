/**
 * HTML 格式化相关类型定义
 */

/**
 * HTML 格式化配置
 */
export interface HtmlFormatConfig {
  /** 缩进空格数（默认 2） */
  indent?: number;
  /** 格式化模式 */
  mode?: FormatMode;
}

/**
 * HTML 格式化模式
 */
export type FormatMode = 'pretty' | 'compact';

/**
 * HTML 格式化结果
 */
export interface HtmlFormatResult {
  /** 是否成功 */
  success: boolean;
  /** 格式化后的 HTML 字符串 */
  result: string;
  /** 错误信息（如果失败） */
  error?: string;
}

/**
 * HTML 验证结果
 */
export interface HtmlValidateResult {
  /** 是否有效的 HTML */
  isValid: boolean;
  /** 错误信息（如果无效） */
  errorMessage?: string;
  /** 错误位置（行号，从 1 开始） */
  errorLine?: number;
}
