import { useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { Download, FolderOpen, Image as ImageIcon, Minimize2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { cn } from "@/lib/utils";
import {
  DEFAULT_IMAGE_COMPRESSION_OPTIONS,
  IMAGE_COMPRESS_FORMATS,
  IMAGE_INPUT_EXTENSIONS,
  type ImageCompressionOptions,
  type ImageConversionPreviewResult,
  type ImageSourceInfo,
} from "@/types/image-converter";
import { formatBytes, formatPath, getDefaultFileName, getOutputExtension } from "@/components/features/ImageTools/imageToolUtils";

function getCompressionRatio(sourceBytes: number, outputBytes: number) {
  if (sourceBytes <= 0) return "0%";
  const ratio = ((sourceBytes - outputBytes) / sourceBytes) * 100;
  return `${ratio >= 0 ? "-" : "+"}${Math.abs(ratio).toFixed(1)}%`;
}

export function ImageCompressorPage() {
  const [inputPath, setInputPath] = useState("");
  const [sourceInfo, setSourceInfo] = useState<ImageSourceInfo | null>(null);
  const [options, setOptions] = useState<ImageCompressionOptions>(DEFAULT_IMAGE_COMPRESSION_OPTIONS);
  const [preview, setPreview] = useState<ImageConversionPreviewResult | null>(null);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedFormat = useMemo(
    () => IMAGE_COMPRESS_FORMATS.find((format) => format.value === options.targetFormat),
    [options.targetFormat]
  );

  const updateOptions = (updates: Partial<ImageCompressionOptions>) => {
    setOptions((current) => ({ ...current, ...updates }));
    setPreview(null);
  };

  const handlePickFile = async () => {
    try {
      const selected = await open({
        title: "选择待压缩图片",
        multiple: false,
        filters: [{ name: "图片", extensions: [...IMAGE_INPUT_EXTENSIONS] }],
      });

      if (!selected || typeof selected !== "string") {
        return;
      }

      const info = await invoke<ImageSourceInfo>("get_image_source_info", { inputPath: selected });
      setInputPath(selected);
      setSourceInfo(info);
      setPreview(null);
      setError("");
    } catch (dialogError) {
      setError(dialogError instanceof Error ? dialogError.message : String(dialogError));
    }
  };

  const generatePreview = async () => {
    if (!inputPath) {
      setError("请先选择一张图片");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const result = await invoke<ImageConversionPreviewResult>("generate_image_compression_preview", {
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
      title: "保存压缩结果",
      defaultPath: getDefaultFileName(inputPath, "compressed", options.targetFormat),
      filters: [{ name: selectedFormat?.label ?? options.targetFormat.toUpperCase(), extensions: [getOutputExtension(options.targetFormat)] }],
    });

    if (!outputPath) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await invoke("save_compressed_image", { inputPath, outputPath, options });
    } catch (invokeError) {
      setError(invokeError instanceof Error ? invokeError.message : String(invokeError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageSection className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader title="图片压缩" description="面向资源优化场景，支持压缩时顺带输出 JPEG、WebP 或 PNG。" backTo="/" />
        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card className="rounded-[1.5rem] border-border/60 bg-background/80">
            <CardHeader>
              <CardTitle className="text-xl">压缩设置</CardTitle>
              <CardDescription>首版为单图优先，适合快速处理网页资源、应用素材和产品截图。</CardDescription>
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
                  {IMAGE_COMPRESS_FORMATS.map((format) => (
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
                      <div className={cn("mt-1 text-xs", options.targetFormat === format.value ? "text-white/75 dark:text-slate-700" : "text-muted-foreground")}>
                        {format.description}
                      </div>
                    </button>
                  ))}
                </div>
                {options.targetFormat === "png" ? (
                  <div className="rounded-[1rem] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                    PNG 首版只做重新编码，不包含调色板量化或更激进的压缩策略，体积不一定下降。
                  </div>
                ) : null}
              </div>

              {(options.targetFormat === "jpeg" || options.targetFormat === "webp") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="compress-quality">质量</Label>
                    <Badge variant="outline">{options.quality}</Badge>
                  </div>
                  <Input
                    id="compress-quality"
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
                  <Label htmlFor="compress-background-color">透明背景填充</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="compress-background-color"
                      type="color"
                      value={options.backgroundColor}
                      onChange={(event) => updateOptions({ backgroundColor: event.target.value.toUpperCase() })}
                      className="h-11 w-16 rounded-xl p-1"
                    />
                    <Input value={options.backgroundColor} onChange={(event) => updateOptions({ backgroundColor: event.target.value.toUpperCase() })} className="font-mono" />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void generatePreview()} disabled={isGenerating || !inputPath}>
                  <Minimize2 className="h-4 w-4" />
                  {isGenerating ? "生成中..." : "生成预览"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setOptions(DEFAULT_IMAGE_COMPRESSION_OPTIONS);
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
                <CardTitle className="text-xl">压缩结果</CardTitle>
                <CardDescription>预览显示后端实际输出结果，便于直观比较体积和质量。</CardDescription>
              </CardHeader>
              <CardContent>
                {preview ? (
                  <div className="space-y-4">
                    <div className="flex min-h-[360px] items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.16),transparent_58%),linear-gradient(135deg,rgba(15,23,42,0.03),rgba(148,163,184,0.08))] p-6">
                      <img src={preview.dataUrl} alt="压缩预览" className="max-h-[520px] max-w-full rounded-xl shadow-lg" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <MetaItem label="源体积" value={formatBytes(preview.sourceBytes)} />
                      <MetaItem label="输出体积" value={formatBytes(preview.estimatedBytes)} />
                      <MetaItem label="压缩比例" value={getCompressionRatio(preview.sourceBytes, preview.estimatedBytes)} />
                      <MetaItem label="输出格式" value={preview.outputFormat.toUpperCase()} />
                      <MetaItem label="源尺寸" value={`${preview.sourceWidth} × ${preview.sourceHeight}`} />
                      <MetaItem label="输出尺寸" value={`${preview.outputWidth} × ${preview.outputHeight}`} />
                      <MetaItem label="源格式" value={preview.sourceFormat.toUpperCase()} />
                      <MetaItem label="透明通道" value={preview.hasAlpha ? "包含 Alpha" : "无 Alpha"} />
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-muted/20 px-6 text-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    <div className="mt-4 text-lg font-semibold">还没有压缩预览</div>
                    <div className="mt-2 max-w-md text-sm text-muted-foreground">选择图片后设定输出格式和质量，点击“生成预览”查看预计体积变化。</div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem] border-border/60 bg-background/80">
              <CardHeader>
                <CardTitle className="text-xl">源图信息</CardTitle>
                <CardDescription>用于快速判断是否需要裁剪、缩放或先转格式。</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <MetaItem label="当前格式" value={sourceInfo?.sourceFormat.toUpperCase() ?? "-"} />
                <MetaItem label="当前尺寸" value={sourceInfo ? `${sourceInfo.width} × ${sourceInfo.height}` : "-"} />
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

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-border/60 bg-background/70 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
