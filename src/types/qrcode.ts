/**
 * 二维码生成相关类型定义
 */

/**
 * 二维码配置
 */
export interface QrConfig {
  /** 二维码内容 */
  content: string;
  /** 输出尺寸（像素） */
  size: number;
  /** 边距（模块数） */
  margin: number;
  /** 容错级别 */
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  /** 样式配置 */
  style: QrStyle;
  /** Logo 配置 */
  logo?: LogoConfig;
}

/**
 * 二维码样式
 */
export interface QrStyle {
  /** 点形状 */
  dotShape: 'square' | 'circle' | 'rounded';
  /** 码眼形状 */
  eyeShape: 'square' | 'circle' | 'rounded';
  /** 前景色（Hex 颜色代码） */
  foregroundColor: string;
  /** 背景色（Hex 颜色代码） */
  backgroundColor: string;
  /** 是否使用渐变 */
  isGradient: boolean;
  /** 渐变颜色列表 */
  gradientColors?: string[];
}

/**
 * Logo 配置
 */
export interface LogoConfig {
  /** Logo 文件路径 */
  path: string;
  /** 缩放比例 (0.05 - 0.3) */
  scale: number;
  /** 是否添加边框 */
  hasBorder: boolean;
  /** 边框宽度（像素） */
  borderWidth: number;
}

/**
 * 二维码生成结果
 */
export interface QrResult {
  /** Base64 编码的图片数据（带 data URL 前缀） */
  data: string;
  /** 图片格式（如 "png"） */
  format: string;
}

/**
 * Tauri 命令类型声明
 */
export type QrCodeCommands = {
  /** 生成二维码预览 */
  generate_qr_preview: (config: QrConfig) => Promise<QrResult>;
  /** 生成二维码并保存到文件 */
  generate_qr_file: (config: QrConfig, outputPath: string) => Promise<void>;
};

/**
 * 默认样式配置
 */
export const DEFAULT_QR_STYLE: QrStyle = {
  dotShape: 'square',
  eyeShape: 'square',
  foregroundColor: '#000000',
  backgroundColor: '#FFFFFF',
  isGradient: false,
  gradientColors: undefined,
};

/**
 * 默认二维码配置
 */
export const DEFAULT_QR_CONFIG: QrConfig = {
  content: 'https://example.com',
  size: 512,
  margin: 4,
  errorCorrection: 'M',
  style: DEFAULT_QR_STYLE,
};

/**
 * 容错级别选项
 */
export const ERROR_CORRECTION_OPTIONS = [
  { value: 'L', label: 'L (7%)', description: '低容错率' },
  { value: 'M', label: 'M (15%)', description: '中容错率（推荐）' },
  { value: 'Q', label: 'Q (25%)', description: '高容错率' },
  { value: 'H', label: 'H (30%)', description: '最高容错率' },
] as const;

/**
 * 预设尺寸选项
 */
export const SIZE_PRESETS = [
  { value: 256, label: '小 (256px)' },
  { value: 512, label: '中 (512px)' },
  { value: 1024, label: '大 (1024px)' },
  { value: 2048, label: '超大 (2048px)' },
] as const;

/**
 * 点形状选项
 */
export const DOT_SHAPE_OPTIONS = [
  { value: 'square', label: '方块', icon: '⬜' },
  { value: 'circle', label: '圆点', icon: '⚫' },
  { value: 'rounded', label: '圆角', icon: '▢' },
] as const;

/**
 * 码眼形状选项
 */
export const EYE_SHAPE_OPTIONS = [
  { value: 'square', label: '方块', icon: '⬜' },
  { value: 'circle', label: '圆点', icon: '⚫' },
  { value: 'rounded', label: '圆角', icon: '▢' },
] as const;

/**
 * 预设颜色方案
 */
export const COLOR_PRESETS = [
  {
    name: '经典',
    foreground: '#000000',
    background: '#FFFFFF',
  },
  {
    name: '蓝白',
    foreground: '#1E40AF',
    background: '#DBEAFE',
  },
  {
    name: '红白',
    foreground: '#DC2626',
    background: '#FEE2E2',
  },
  {
    name: '绿白',
    foreground: '#059669',
    background: '#D1FAE5',
  },
  {
    name: '紫白',
    foreground: '#7C3AED',
    background: '#EDE9FE',
  },
  {
    name: '橙白',
    foreground: '#EA580C',
    background: '#FFEDD5',
  },
] as const;
