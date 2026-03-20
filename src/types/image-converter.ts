export type ImageOutputFormat = "png" | "jpeg" | "webp" | "bmp" | "tiff" | "ico";

export interface ImageConversionOptions {
  targetFormat: ImageOutputFormat;
  quality: number;
  webpLossless: boolean;
  backgroundColor: string;
  icoSize: 16 | 32 | 48 | 64 | 128 | 256;
}

export interface ImageConversionPreviewResult {
  dataUrl: string;
  previewFormat: string;
  outputFormat: string;
  sourceFormat: string;
  sourceWidth: number;
  sourceHeight: number;
  outputWidth: number;
  outputHeight: number;
  hasAlpha: boolean;
  estimatedBytes: number;
}

export const IMAGE_INPUT_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff", "ico", "svg"] as const;

export const IMAGE_OUTPUT_FORMATS: { value: ImageOutputFormat; label: string; description: string }[] = [
  { value: "png", label: "PNG", description: "无损，保留透明" },
  { value: "jpeg", label: "JPEG", description: "通用压缩格式" },
  { value: "webp", label: "WebP", description: "现代压缩格式" },
  { value: "bmp", label: "BMP", description: "位图原始格式" },
  { value: "tiff", label: "TIFF", description: "高保真格式" },
  { value: "ico", label: "ICO", description: "桌面图标格式" },
] as const;

export const ICO_SIZE_OPTIONS = [16, 32, 48, 64, 128, 256] as const;

export const DEFAULT_IMAGE_CONVERSION_OPTIONS: ImageConversionOptions = {
  targetFormat: "png",
  quality: 92,
  webpLossless: false,
  backgroundColor: "#FFFFFF",
  icoSize: 256,
};
