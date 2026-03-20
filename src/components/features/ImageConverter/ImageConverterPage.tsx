import { useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { ArrowRightLeft, Download, FolderOpen, Image as ImageIcon, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { cn } from "@/lib/utils";
import {
  DEFAULT_IMAGE_CONVERSION_OPTIONS,
  ICO_SIZE_OPTIONS,
  IMAGE_INPUT_EXTENSIONS,
  IMAGE_OUTPUT_FORMATS,
  type ImageConversionOptions,
  type ImageConversionPreviewResult,
  type ImageOutputFormat,
} from "@/types/image-converter";

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function formatPath(path: string) {
  if (path.length <= 60) {
    return path;
  }

  return `${path.slice(0, 24)}...${path.slice(-28)}`;
}

function getDefaultFileName(inputPath: string, targetFormat: ImageOutputFormat) {
  const parts = inputPath.split(/[/\\]/);
  const fileName = parts[parts.length - 1] ?? "converted-image";
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const extension = targetFormat === "jpeg" ? "jpg" : targetFormat;
  return `${baseName}.${extension}`;
}

export function ImageConverterPage() {
  const [inputPath, setInputPath] = useState("");
  const [options, setOptions] = useState<ImageConversionOptions>(DEFAULT_IMAGE_CONVERSION_OPTIONS);
  const [preview, setPreview] = useState<ImageConversionPreviewResult | null>(null);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedFormatMeta = useMemo(
    () => IMAGE_OUTPUT_FORMATS.find((format) => format.value === options.targetFormat),
    [options.targetFormat]
  );

  const updateOptions = (updates: Partial<ImageConversionOptions>) => {
    setOptions((current) => ({ ...current, ...updates }));
    setPreview(null);
  };

  const generatePreview = async () => {
    if (!inputPath) {
      setError("请先选择一张图片");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const result = await invoke<ImageConversionPreviewResult>("generate_image_conversion_preview", {
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

  const handlePickFile = async () => {
    try {
      const selected = await open({
        title: "选择待转换图片",
        multiple: false,
        filters: [
          {
            name: "图片",
            extensions: [...IMAGE_INPUT_EXTENSIONS],
          },
        ],
      });

      if (!selected || typeof selected !== "string") {
        return;
      }

      setInputPath(selected);
      setPreview(null);
      setError("");
    } catch (dialogError) {
      setError(dialogError instanceof Error ? dialogError.message : String(dialogError));
    }
  };

  const handleSave = async () => {
    if (!inputPath) {
      setError("请先选择一张图片");
      return;
    }

    const outputPath = await save({
      title: "保存转换结果",
      defaultPath: getDefaultFileName(inputPath, options.targetFormat),
      filters: [
        {
          name: selectedFormatMeta?.label ?? options.targetFormat.toUpperCase(),
          extensions: [options.targetFormat === "jpeg" ? "jpg" : options.targetFormat],
        },
      ],
    });

    if (!outputPath) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await invoke("save_converted_image", {
        inputPath,
        outputPath,
        options,
      });
    } catch (invokeError) {
      setError(invokeError instanceof Error ? invokeError.message : String(invokeError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageSection className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="图片转换"
          description="支持 PNG、JPEG、WebP、BMP、TIFF、ICO 互转，并额外支持 SVG 输入转位图。"
          backTo="/"
        />

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card className="rounded-[1.5rem] border-border/60 bg-background/80">
            <CardHeader>
              <CardTitle className="text-xl">转换设置</CardTitle>
              <CardDescription>首版支持单张转换、预览和另存为。</CardDescription>
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
                  {inputPath ? formatPath(inputPath) : "支持 png / jpg / jpeg / webp / bmp / tiff / ico / svg"}
                </div>
              </div>

              <div className="space-y-3">
                <Label>目标格式</Label>
                <div className="grid grid-cols-2 gap-2">
                  {IMAGE_OUTPUT_FORMATS.map((format) => (
                    <button
                      key={format.value}
                      type="button"
                      onClick={() => updateOptions({ targetFormat: format.value })}
                      className={cn(
                        "rounded-[1rem] border px-3 py-3 text-left transition",
                        options.targetFormat === format.value
                          ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                          : "border-border/60 bg-background/70 hover:border-border hover:bg-background"
                      )}
                    >
                      <div className="text-sm font-semibold">{format.label}</div>
                      <div
                        className={cn(
                          "mt-1 text-xs",
                          options.targetFormat === format.value ? "text-white/75 dark:text-slate-700" : "text-muted-foreground"
                        )}
                      >
                        {format.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {(options.targetFormat === "jpeg" || options.targetFormat === "webp") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="quality">质量</Label>
                    <Badge variant="outline">{options.quality}</Badge>
                  </div>
                  <Input
                    id="quality"
                    type="range"
                    min="1"
                    max="100"
                    value={options.quality}
                    onChange={(event) => updateOptions({ quality: Number(event.target.value) })}
                    className="px-0"
                  />
                </div>
              )}

              {options.targetFormat === "webp" && (
                <div className="space-y-3">
                  <Label>WebP 编码</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={options.webpLossless ? "outline" : "default"}
                      onClick={() => updateOptions({ webpLossless: false })}
                    >
                      有损
                    </Button>
                    <Button
                      type="button"
                      variant={options.webpLossless ? "default" : "outline"}
                      onClick={() => updateOptions({ webpLossless: true })}
                    >
                      无损
                    </Button>
                  </div>
                </div>
              )}

              {(options.targetFormat === "jpeg" || options.targetFormat === "bmp") && (
                <div className="space-y-3">
                  <Label htmlFor="background-color">透明背景填充</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="background-color"
                      type="color"
                      value={options.backgroundColor}
                      onChange={(event) => updateOptions({ backgroundColor: event.target.value.toUpperCase() })}
                      className="h-11 w-16 rounded-xl p-1"
                    />
                    <Input
                      value={options.backgroundColor}
                      onChange={(event) => updateOptions({ backgroundColor: event.target.value.toUpperCase() })}
                      className="font-mono"
                    />
                  </div>
                </div>
              )}

              {options.targetFormat === "ico" && (
                <div className="space-y-3">
                  <Label>ICO 尺寸</Label>
                  <div className="flex flex-wrap gap-2">
                    {ICO_SIZE_OPTIONS.map((size) => (
                      <Button
                        key={size}
                        type="button"
                        variant={options.icoSize === size ? "default" : "outline"}
                        onClick={() => updateOptions({ icoSize: size })}
                      >
                        {size}px
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void generatePreview()} disabled={isGenerating || !inputPath}>
                  <ArrowRightLeft className="h-4 w-4" />
                  {isGenerating ? "生成中..." : "生成预览"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setOptions(DEFAULT_IMAGE_CONVERSION_OPTIONS);
                    setPreview(null);
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
                <CardTitle className="text-xl">结果预览</CardTitle>
                <CardDescription>预览由后端生成，确保与你最终保存的文件一致。</CardDescription>
              </CardHeader>
              <CardContent>
                {preview ? (
                  <div className="space-y-4">
                    <div className="flex min-h-[360px] items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.16),transparent_58%),linear-gradient(135deg,rgba(15,23,42,0.03),rgba(148,163,184,0.08))] p-6">
                      <img src={preview.dataUrl} alt="转换预览" className="max-h-[520px] max-w-full rounded-xl shadow-lg" />
                    </div>
                    {preview.previewFormat !== preview.outputFormat ? (
                      <div className="rounded-[1rem] border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                        当前目标格式为 {preview.outputFormat.toUpperCase()}，但预览使用 {preview.previewFormat.toUpperCase()} 渲染，
                        因为当前 WebView 对 {preview.outputFormat.toUpperCase()} 直接显示支持不稳定。
                      </div>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <MetaItem label="预览格式" value={preview.previewFormat.toUpperCase()} />
                      <MetaItem label="源格式" value={preview.sourceFormat.toUpperCase()} />
                      <MetaItem label="目标格式" value={preview.outputFormat.toUpperCase()} />
                      <MetaItem label="原始尺寸" value={`${preview.sourceWidth} × ${preview.sourceHeight}`} />
                      <MetaItem label="输出尺寸" value={`${preview.outputWidth} × ${preview.outputHeight}`} />
                      <MetaItem label="透明通道" value={preview.hasAlpha ? "包含 Alpha" : "无 Alpha"} />
                      <MetaItem label="预估体积" value={formatBytes(preview.estimatedBytes)} />
                      <MetaItem label="ICO 尺寸" value={options.targetFormat === "ico" ? `${options.icoSize}px` : "原始尺寸"} />
                      <MetaItem label="编码说明" value={selectedFormatMeta?.description ?? "-"} />
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-muted/20 px-6 text-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    <div className="mt-4 text-lg font-semibold">还没有生成预览</div>
                    <div className="mt-2 max-w-md text-sm text-muted-foreground">
                      先选择一张图片，再确认目标格式和参数，点击“生成预览”即可查看转换结果。
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem] border-border/60 bg-background/80">
              <CardHeader>
                <CardTitle className="text-xl">转换规则</CardTitle>
                <CardDescription>首版范围已固定，避免隐藏行为。</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                <RuleItem text="支持 PNG、JPEG、WebP、BMP、TIFF、ICO 互转。" />
                <RuleItem text="支持 SVG 输入并转换为任意位图输出格式。" />
                <RuleItem text="不支持 GIF，也不支持位图转 SVG。" />
                <RuleItem text="透明转 JPEG/BMP 时默认用背景色填充。" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageSection>
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

function RuleItem({ text }: { text: string }) {
  return <div className="rounded-[1rem] border border-border/60 bg-muted/20 px-4 py-3">{text}</div>;
}
