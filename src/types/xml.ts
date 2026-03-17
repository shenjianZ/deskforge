/**
 * XML 格式化相关类型定义
 */

/**
 * XML 格式化配置
 */
export interface XmlFormatConfig {
  /** 缩进空格数（默认 2） */
  indent?: number;
  /** 格式化模式 */
  mode?: FormatMode;
}

/**
 * XML 格式化模式
 */
export type FormatMode = 'pretty' | 'compact';

/**
 * XML 格式化结果
 */
export interface XmlFormatResult {
  /** 是否成功 */
  success: boolean;
  /** 格式化后的 XML 字符串 */
  result: string;
  /** 错误信息（如果失败） */
  error?: string;
}

/**
 * XML 验证结果
 */
export interface XmlValidateResult {
  /** 是否有效的 XML */
  isValid: boolean;
  /** 错误信息（如果无效） */
  errorMessage?: string;
  /** 错误位置（行号，从 1 开始） */
  errorLine?: number;
}
