/**
 * JSON 格式化相关类型定义
 */

/**
 * JSON 格式化配置
 */
export interface JsonFormatConfig {
  /** 缩进空格数（默认 2） */
  indent?: number;
  /** 是否对 key 进行排序 */
  sortKeys?: boolean;
  /** 格式化模式 */
  mode?: FormatMode;
}

/**
 * JSON 格式化模式
 */
export type FormatMode = 'pretty' | 'compact';

/**
 * JSON 格式化结果
 */
export interface JsonFormatResult {
  /** 是否成功 */
  success: boolean;
  /** 格式化后的 JSON 字符串 */
  result: string;
  /** 错误信息（如果失败） */
  error?: string;
  /** 原始 JSON 是否有效 */
  isValid: boolean;
}

/**
 * JSON 验证结果
 */
export interface JsonValidateResult {
  /** 是否有效的 JSON */
  isValid: boolean;
  /** 错误信息（如果无效） */
  errorMessage?: string;
  /** 错误位置（行号，从 1 开始） */
  errorLine?: number;
  /** 错误位置（列号，从 1 开始） */
  errorColumn?: number;
}
