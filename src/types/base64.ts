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

/**
 * 图片 Base64 处理结果
 */
export interface Base64ImageResult {
  /** 纯 Base64 内容 */
  base64: string;
  /** Data URL 内容 */
  dataUrl: string;
  /** MIME 类型 */
  mime: string;
  /** 图片格式 */
  format: string;
  /** 建议扩展名 */
  suggestedExtension: string;
  /** 图片宽度 */
  width: number;
  /** 图片高度 */
  height: number;
  /** 原始字节大小 */
  byteSize: number;
}

export type Base64ToolMode = 'text' | 'image';
export type Base64ImageTextView = 'dataUrl' | 'base64';

export const BASE64_IMAGE_INPUT_EXTENSIONS = ['png', 'jpg', 'jpeg', 'jfif', 'webp', 'bmp', 'tif', 'tiff', 'ico', 'gif'] as const;
