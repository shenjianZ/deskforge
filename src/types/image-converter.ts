export type ImageOutputFormat = "png" | "jpeg" | "webp" | "bmp" | "tiff" | "ico";
export type ImageResampleMode = "quality" | "fast";

export interface ImageSourceInfo {
  sourceFormat: string;
  width: number;
  height: number;
  hasAlpha: boolean;
  fileSize: number;
  previewDataUrl: string;
}

export interface ImageConversionOptions {
  targetFormat: ImageOutputFormat;
  quality: number;
  webpLossless: boolean;
  backgroundColor: string;
  icoSize: 16 | 32 | 48 | 64 | 128 | 256 | 512;
}

export interface ImageCompressionOptions {
  targetFormat: "png" | "jpeg" | "webp";
  quality: number;
  webpLossless: boolean;
  backgroundColor: string;
}

export interface ImageCropOptions {
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  targetFormat: "png" | "jpeg" | "webp" | "ico";
  quality: number;
  webpLossless: boolean;
  backgroundColor: string;
  icoSize: 16 | 32 | 48 | 64 | 128 | 256 | 512;
  outputSize: number | null;
}

export interface ImageResizeOptions {
  targetWidth: number;
  targetHeight: number;
  targetFormat: "png" | "jpeg" | "webp";
  quality: number;
  webpLossless: boolean;
  backgroundColor: string;
  resampleMode: ImageResampleMode;
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
  sourceBytes: number;
  estimatedBytes: number;
}

export const IMAGE_INPUT_EXTENSIONS = ["png", "jpg", "jpeg", "jfif", "webp", "bmp", "tif", "tiff", "ico", "svg"] as const;

export const IMAGE_OUTPUT_FORMATS: { value: ImageOutputFormat; label: string; description: string }[] = [
  { value: "png", label: "PNG", description: "无损，保留透明" },
  { value: "jpeg", label: "JPEG", description: "通用压缩格式" },
  { value: "webp", label: "WebP", description: "现代压缩格式" },
  { value: "bmp", label: "BMP", description: "位图原始格式" },
  { value: "tiff", label: "TIFF", description: "高保真格式" },
  { value: "ico", label: "ICO", description: "桌面图标格式" },
] as const;

export const IMAGE_COMPRESS_FORMATS: { value: ImageCompressionOptions["targetFormat"]; label: string; description: string }[] = [
  { value: "jpeg", label: "JPEG", description: "适合照片和常规资源压缩" },
  { value: "webp", label: "WebP", description: "更现代，通常体积更小" },
  { value: "png", label: "PNG", description: "保留透明，适合 UI 资源" },
] as const;

export const IMAGE_CROP_FORMATS: { value: ImageCropOptions["targetFormat"]; label: string }[] = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
  { value: "ico", label: "ICO" },
] as const;

export const IMAGE_RESIZE_FORMATS: { value: ImageResizeOptions["targetFormat"]; label: string }[] = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
] as const;

export const ICO_SIZE_OPTIONS = [16, 32, 48, 64, 128, 256, 512] as const;
export const RESIZE_PRESETS = [
  { label: "64", width: 64, height: 64 },
  { label: "128", width: 128, height: 128 },
  { label: "256", width: 256, height: 256 },
  { label: "512", width: 512, height: 512 },
  { label: "1024", width: 1024, height: 1024 },
  { label: "1920×1080", width: 1920, height: 1080 },
] as const;

export const DEFAULT_IMAGE_CONVERSION_OPTIONS: ImageConversionOptions = {
  targetFormat: "png",
  quality: 92,
  webpLossless: false,
  backgroundColor: "#FFFFFF",
  icoSize: 256,
};

export const DEFAULT_IMAGE_COMPRESSION_OPTIONS: ImageCompressionOptions = {
  targetFormat: "webp",
  quality: 80,
  webpLossless: false,
  backgroundColor: "#FFFFFF",
};

export const DEFAULT_IMAGE_CROP_OPTIONS: ImageCropOptions = {
  cropX: 0,
  cropY: 0,
  cropWidth: 256,
  cropHeight: 256,
  targetFormat: "png",
  quality: 92,
  webpLossless: false,
  backgroundColor: "#FFFFFF",
  icoSize: 256,
  outputSize: null,
};

export const DEFAULT_IMAGE_RESIZE_OPTIONS: ImageResizeOptions = {
  targetWidth: 512,
  targetHeight: 512,
  targetFormat: "png",
  quality: 92,
  webpLossless: false,
  backgroundColor: "#FFFFFF",
  resampleMode: "quality",
};
