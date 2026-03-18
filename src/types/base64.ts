/**
 * Base64 工具相关类型定义
 */

/**
 * Base64 变体
 */
export type Base64Variant = 'standard' | 'urlSafe';

/**
 * Base64 处理配置
 */
export interface Base64ProcessConfig {
  /** Base64 变体 */
  variant?: Base64Variant;
  /** 是否保留填充符 */
  padding?: boolean;
}

/**
 * Base64 处理结果
 */
export interface Base64ProcessResult {
  /** 是否成功 */
  success: boolean;
  /** 处理结果 */
  result: string;
  /** 错误信息 */
  error?: string;
}

/**
 * Base64 校验结果
 */
export interface Base64ValidateResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误信息 */
  errorMessage?: string;
}
