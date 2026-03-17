/**
 * 颜色相关类型定义
 */

/**
 * 颜色信息
 */
export interface ColorInfo {
  /** 十六进制颜色值（格式：#RRGGBB） */
  hex: string;
  /** RGB 颜色值 */
  rgb: RgbInfo;
  /** HSL 颜色值 */
  hsl: HslInfo;
  /** 屏幕坐标 X（像素） */
  x: number;
  /** 屏幕坐标 Y（像素） */
  y: number;
}

/**
 * RGB 颜色
 */
export interface RgbInfo {
  /** 红色分量 (0-255) */
  r: number;
  /** 绿色分量 (0-255) */
  g: number;
  /** 蓝色分量 (0-255) */
  b: number;
}

/**
 * HSL 颜色
 */
export interface HslInfo {
  /** 色相 (0-360) */
  h: number;
  /** 饱和度 (0-100) */
  s: number;
  /** 亮度 (0-100) */
  l: number;
}
