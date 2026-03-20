import { useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { Download, FolderOpen, Image as ImageIcon, MoveDiagonal, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import {
  DEFAULT_IMAGE_RESIZE_OPTIONS,
  IMAGE_INPUT_EXTENSIONS,
  IMAGE_RESIZE_FORMATS,
  RESIZE_PRESETS,
  type ImageConversionPreviewResult,
  type ImageResizeOptions,
  type ImageSourceInfo,
} from "@/types/image-converter";
import { formatBytes, formatPath, getDefaultFileName, getOutputExtension } from "@/components/features/ImageTools/imageToolUtils";

export function ImageResizerPage() {
  const [inputPath, setInputPath] = useState("");
  const [sourceInfo, setSourceInfo] = useState<ImageSourceInfo | null>(null);
  const [options, setOptions] = useState<ImageResizeOptions>(DEFAULT_IMAGE_RESIZE_OPTIONS);
  const [keepRatio, setKeepRatio] = useState(true);
  const [preview, setPreview] = useState<ImageConversionPreviewResult | null>(null);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedFormat = useMemo(
    () => IMAGE_RESIZE_FORMATS.find((format) => format.value === options.targetFormat),
    [options.targetFormat]
  );

  const updateOptions = (updates: Partial<ImageResizeOptions>) => {
    setOptions((current) => ({ ...current, ...updates }));
    setPreview(null);
  };

  const handlePickFile = async () => {
    try {
      const selected = await open({
        title: "选择待缩放图片",
        multiple: false,
        filters: [{ name: "图片", extensions: [...IMAGE_INPUT_EXTENSIONS] }],
      });

      if (!selected || typeof selected !== "string") {
        return;
      }

      const info = await invoke<ImageSourceInfo>("get_image_source_info", { inputPath: selected });
      setInputPath(selected);
      setSourceInfo(info);
      setOptions({
        ...DEFAULT_IMAGE_RESIZE_OPTIONS,
        targetWidth: info.width,
        targetHeight: info.height,
      });
      setPreview(null);
      setError("");
    } catch (dialogError) {
      setError(dialogError instanceof Error ? dialogError.message : String(dialogError));
    }
  };

  const setWidth = (value: number) => {
    if (!sourceInfo || !keepRatio) {
      updateOptions({ targetWidth: value });
      return;
    }

    const height = Math.max(1, Math.round((value * sourceInfo.height) / sourceInfo.width));
    updateOptions({ targetWidth: value, targetHeight: height });
  };

  const setHeight = (value: number) => {
    if (!sourceInfo || !keepRatio) {
      updateOptions({ targetHeight: value });
      return;
    }

    const width = Math.max(1, Math.round((value * sourceInfo.width) / sourceInfo.height));
    updateOptions({ targetWidth: width, targetHeight: value });
  };

  const generatePreview = async () => {
    if (!inputPath) {
      setError("请先选择一张图片");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const result = await invoke<ImageConversionPreviewResult>("generate_image_resize_preview", {
        inputPath,
        options,
      });
      setPreview(result);
    } catch (invokeError) {
      setError(invokeError instanceof Error ? invokeError.message : String(invokeError));
      setPreview(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!inputPath) {
      setError("请先选择一张图片");
      return;
    }

    const outputPath = await save({
      title: "保存缩放结果",
      defaultPath: getDefaultFileName(inputPath, "resized", options.targetFormat),
      filters: [{ name: selectedFormat?.label ?? options.targetFormat.toUpperCase(), extensions: [getOutputExtension(options.targetFormat)] }],
    });

    if (!outputPath) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await invoke("save_resized_image", { inputPath, outputPath, options });
    } catch (invokeError) {
      setError(invokeError instanceof Error ? invokeError.message : String(invokeError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageSection className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader title="图片缩放" description="按明确像素尺寸重采样输出，适合资源生产和平台素材适配。" backTo="/" />
        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card className="rounded-[1.5rem] border-border/60 bg-background/80">
            <CardHeader>
              <CardTitle className="text-xl">缩放设置</CardTitle>
              <CardDescription>支持锁定比例、常用尺寸预设和质量/速度两档重采样。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>输入文件</Label>
                  <Button variant="outline" size="sm" onClick={() => void handlePickFile()}>
                    <FolderOpen className="h-4 w-4" />
                    选择图片
                  </Button>
                </div>
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  {inputPath ? formatPath(inputPath) : "支持 png / jpg / jpeg / jfif / webp / bmp / tiff / ico / svg"}
                </div>
              </div>

              <div className="space-y-3">
                <Label>输出格式</Label>
                <div className="grid grid-cols-3 gap-2">
                  {IMAGE_RESIZE_FORMATS.map((format) => (
                    <Button key={format.value} type="button" variant={options.targetFormat === format.value ? "default" : "outline"} onClick={() => updateOptions({ targetFormat: format.value })}>
                      {format.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>目标尺寸</Label>
                  <Button type="button" variant={keepRatio ? "default" : "outline"} onClick={() => setKeepRatio((current) => !current)}>
                    {keepRatio ? "锁定比例" : "自由尺寸"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField label="宽度" value={options.targetWidth} onChange={setWidth} />
                  <NumberField label="高度" value={options.targetHeight} onChange={setHeight} />
                </div>
              </div>

              <div className="space-y-3">
                <Label>尺寸预设</Label>
                <div className="flex flex-wrap gap-2">
                  {RESIZE_PRESETS.map((preset) => (
                    <Button key={preset.label} type="button" variant="outline" onClick={() => updateOptions({ targetWidth: preset.width, targetHeight: preset.height })}>
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>重采样</Label>
                <div className="flex gap-2">
                  <Button type="button" variant={options.resampleMode === "quality" ? "default" : "outline"} onClick={() => updateOptions({ resampleMode: "quality" })}>
                    质量优先
                  </Button>
                  <Button type="button" variant={options.resampleMode === "fast" ? "default" : "outline"} onClick={() => updateOptions({ resampleMode: "fast" })}>
                    速度优先
                  </Button>
                </div>
              </div>

              {(options.targetFormat === "jpeg" || options.targetFormat === "webp") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="resize-quality">质量</Label>
                    <span className="text-sm font-medium">{options.quality}</span>
                  </div>
                  <Input id="resize-quality" type="range" min="1" max="100" value={options.quality} onChange={(event) => updateOptions({ quality: Number(event.target.value) })} className="px-0" />
                </div>
              )}

              {options.targetFormat === "webp" && (
                <div className="space-y-3">
                  <Label>WebP 编码</Label>
                  <div className="flex gap-2">
                    <Button type="button" variant={options.webpLossless ? "outline" : "default"} onClick={() => updateOptions({ webpLossless: false })}>
                      有损
                    </Button>
                    <Button type="button" variant={options.webpLossless ? "default" : "outline"} onClick={() => updateOptions({ webpLossless: true })}>
                      无损
                    </Button>
                  </div>
                </div>
              )}

              {options.targetFormat === "jpeg" && (
                <div className="space-y-3">
                  <Label htmlFor="resize-background-color">透明背景填充</Label>
                  <div className="flex items-center gap-3">
                    <Input id="resize-background-color" type="color" value={options.backgroundColor} onChange={(event) => updateOptions({ backgroundColor: event.target.value.toUpperCase() })} className="h-11 w-16 rounded-xl p-1" />
                    <Input value={options.backgroundColor} onChange={(event) => updateOptions({ backgroundColor: event.target.value.toUpperCase() })} className="font-mono" />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void generatePreview()} disabled={isGenerating || !inputPath}>
                  <MoveDiagonal className="h-4 w-4" />
                  {isGenerating ? "生成中..." : "生成预览"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setOptions(DEFAULT_IMAGE_RESIZE_OPTIONS);
                    setKeepRatio(true);
                    setPreview(null);
                    setError("");
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                  重置参数
                </Button>
                <Button variant="outline" onClick={() => void handleSave()} disabled={isSaving || !inputPath}>
                  <Download className="h-4 w-4" />
                  {isSaving ? "保存中..." : "另存为"}
                </Button>
              </div>

              {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-[1.5rem] border-border/60 bg-background/80">
              <CardHeader>
                <CardTitle className="text-xl">缩放预览</CardTitle>
                <CardDescription>输出宽高和导出文件一致，适合快速核对资源尺寸。</CardDescription>
              </CardHeader>
              <CardContent>
                {preview ? (
                  <div className="space-y-4">
                    <div className="flex min-h-[360px] items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.16),transparent_58%),linear-gradient(135deg,rgba(15,23,42,0.03),rgba(148,163,184,0.08))] p-6">
                      <img src={preview.dataUrl} alt="缩放预览" className="max-h-[520px] max-w-full rounded-xl shadow-lg" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <MetaItem label="原始尺寸" value={`${preview.sourceWidth} × ${preview.sourceHeight}`} />
                      <MetaItem label="输出尺寸" value={`${preview.outputWidth} × ${preview.outputHeight}`} />
                      <MetaItem label="源体积" value={formatBytes(preview.sourceBytes)} />
                      <MetaItem label="输出体积" value={formatBytes(preview.estimatedBytes)} />
                      <MetaItem label="输出格式" value={preview.outputFormat.toUpperCase()} />
                      <MetaItem label="预览格式" value={preview.previewFormat.toUpperCase()} />
                      <MetaItem label="重采样" value={options.resampleMode === "quality" ? "质量优先" : "速度优先"} />
                      <MetaItem label="透明通道" value={preview.hasAlpha ? "包含 Alpha" : "无 Alpha"} />
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-muted/20 px-6 text-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    <div className="mt-4 text-lg font-semibold">还没有缩放预览</div>
                    <div className="mt-2 max-w-md text-sm text-muted-foreground">先选择图片，再输入目标尺寸或点一个预设尺寸。</div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem] border-border/60 bg-background/80">
              <CardHeader>
                <CardTitle className="text-xl">原图信息</CardTitle>
                <CardDescription>用来辅助你判断目标尺寸和比例。</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <MetaItem label="原始尺寸" value={sourceInfo ? `${sourceInfo.width} × ${sourceInfo.height}` : "-"} />
                <MetaItem label="原始格式" value={sourceInfo?.sourceFormat.toUpperCase() ?? "-"} />
                <MetaItem label="文件体积" value={sourceInfo ? formatBytes(sourceInfo.fileSize) : "-"} />
                <MetaItem label="透明通道" value={sourceInfo ? (sourceInfo.hasAlpha ? "包含 Alpha" : "无 Alpha") : "-"} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageSection>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" min="1" value={value} onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))} />
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-border/60 bg-background/70 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
