/**
 * 日期时间工具相关类型定义
 */

/**
 * 时间戳单位
 */
export type TimestampUnit = 'seconds' | 'milliseconds';

/**
 * 日期时间输出格式
 */
export type DateTimeOutputFormat = 'iso8601' | 'localDateTime' | 'rfc2822';

/**
 * 日期时间工具配置
 */
export interface DateTimeToolConfig {
  /** 时间戳单位 */
  timestampUnit?: TimestampUnit;
  /** 是否按 UTC 处理无时区日期 */
  useUtc?: boolean;
  /** 输出格式 */
  outputFormat?: DateTimeOutputFormat;
}

/**
 * 日期时间工具结果
 */
export interface DateTimeToolResult {
  /** 是否成功 */
  success: boolean;
  /** 处理结果 */
  result: string;
  /** 错误信息 */
  error?: string;
}
