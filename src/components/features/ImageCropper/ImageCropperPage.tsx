import { useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { Download, FolderOpen, Image as ImageIcon, Move, RefreshCw, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { cn } from "@/lib/utils";
import {
  DEFAULT_IMAGE_CROP_OPTIONS,
  ICO_SIZE_OPTIONS,
  IMAGE_CROP_FORMATS,
  IMAGE_INPUT_EXTENSIONS,
  type ImageConversionPreviewResult,
  type ImageCropOptions,
  type ImageSourceInfo,
} from "@/types/image-converter";
import { formatBytes, formatPath, getDefaultFileName, getOutputExtension } from "@/components/features/ImageTools/imageToolUtils";

type CropMode = "free" | "ratio-1-1" | "ratio-4-3" | "ratio-16-9" | "icon";
type DragState =
  | {
      pointerId: number;
      mode: "draw" | "move";
      startX: number;
      startY: number;
      startRect: { x: number; y: number; width: number; height: number };
    }
  | null;

function getAspectRatio(mode: CropMode) {
  switch (mode) {
    case "ratio-1-1":
    case "icon":
      return 1;
    case "ratio-4-3":
      return 4 / 3;
    case "ratio-16-9":
      return 16 / 9;
    default:
      return null;
  }
}

function applyAspectWidth(mode: CropMode, width: number, currentHeight: number) {
  switch (mode) {
    case "ratio-1-1":
    case "icon":
      return width;
    case "ratio-4-3":
      return Math.max(1, Math.round((width * 3) / 4));
    case "ratio-16-9":
      return Math.max(1, Math.round((width * 9) / 16));
    default:
      return currentHeight;
  }
}

export function ImageCropperPage() {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [inputPath, setInputPath] = useState("");
  const [sourceInfo, setSourceInfo] = useState<ImageSourceInfo | null>(null);
  const [options, setOptions] = useState<ImageCropOptions>(DEFAULT_IMAGE_CROP_OPTIONS);
  const [preview, setPreview] = useState<ImageConversionPreviewResult | null>(null);
  const [cropMode, setCropMode] = useState<CropMode>("free");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dragState, setDragState] = useState<DragState>(null);
  const [imageViewport, setImageViewport] = useState({ width: 0, height: 0 });

  const selectedFormat = useMemo(
    () => IMAGE_CROP_FORMATS.find((format) => format.value === options.targetFormat),
    [options.targetFormat]
  );
  const updateOptions = (updates: Partial<ImageCropOptions>) => {
    setOptions((current) => ({ ...current, ...updates }));
    setPreview(null);
  };

  const isIcoSquareInvalid = options.targetFormat === "ico" && options.cropWidth !== options.cropHeight;
  const aspectRatio = getAspectRatio(cropMode);
  const selectionStyle = useMemo(() => {
    if (!sourceInfo || imageViewport.width === 0 || imageViewport.height === 0) {
      return null;
    }

    return {
      left: `${(options.cropX / sourceInfo.width) * 100}%`,
      top: `${(options.cropY / sourceInfo.height) * 100}%`,
      width: `${(options.cropWidth / sourceInfo.width) * 100}%`,
      height: `${(options.cropHeight / sourceInfo.height) * 100}%`,
    };
  }, [imageViewport.height, imageViewport.width, options.cropHeight, options.cropWidth, options.cropX, options.cropY, sourceInfo]);

  const setAspectMode = (mode: CropMode) => {
    setCropMode(mode);
    setPreview(null);
    setError("");
    setOptions((current) => {
      const nextHeight = applyAspectWidth(mode, current.cropWidth, current.cropHeight);
      return {
        ...current,
        cropHeight: nextHeight,
        targetFormat: mode === "icon" ? "png" : current.targetFormat,
        outputSize: mode === "icon" ? 256 : null,
      };
    });
  };

  const handlePickFile = async () => {
    try {
      const selected = await open({
        title: "选择待裁剪图片",
        multiple: false,
        filters: [{ name: "图片", extensions: [...IMAGE_INPUT_EXTENSIONS] }],
      });

      if (!selected || typeof selected !== "string") {
        return;
      }

      const info = await invoke<ImageSourceInfo>("get_image_source_info", { inputPath: selected });
      setInputPath(selected);
      setSourceInfo(info);
      setCropMode("free");
      setOptions({
        ...DEFAULT_IMAGE_CROP_OPTIONS,
        cropWidth: Math.max(1, Math.min(info.width, 256)),
        cropHeight: Math.max(1, Math.min(info.height, 256)),
      });
      setImageViewport({ width: 0, height: 0 });
      setPreview(null);
      setError("");
    } catch (dialogError) {
      setError(dialogError instanceof Error ? dialogError.message : String(dialogError));
    }
  };

  const updateCropFromDisplayRect = (rect: { x: number; y: number; width: number; height: number }) => {
    if (!sourceInfo || imageViewport.width === 0 || imageViewport.height === 0) {
      return;
    }

    const scaleX = sourceInfo.width / imageViewport.width;
    const scaleY = sourceInfo.height / imageViewport.height;
    updateOptions({
      cropX: Math.round(rect.x * scaleX),
      cropY: Math.round(rect.y * scaleY),
      cropWidth: Math.max(1, Math.round(rect.width * scaleX)),
      cropHeight: Math.max(1, Math.round(rect.height * scaleY)),
    });
  };

  const handleImageLoad = () => {
    if (!imageRef.current) {
      return;
    }

    setImageViewport({
      width: imageRef.current.clientWidth,
      height: imageRef.current.clientHeight,
    });
  };

  const clampRect = (rect: { x: number; y: number; width: number; height: number }) => {
    const width = Math.min(Math.max(1, rect.width), imageViewport.width);
    const height = Math.min(Math.max(1, rect.height), imageViewport.height);
    const x = Math.min(Math.max(0, rect.x), Math.max(0, imageViewport.width - width));
    const y = Math.min(Math.max(0, rect.y), Math.max(0, imageViewport.height - height));

    return { x, y, width, height };
  };

  const buildDrawRect = (startX: number, startY: number, currentX: number, currentY: number) => {
    if (!aspectRatio) {
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      return clampRect({
        x: left,
        y: top,
        width: Math.abs(currentX - startX),
        height: Math.abs(currentY - startY),
      });
    }

    const dx = currentX - startX;
    const dy = currentY - startY;
    const directionX = dx >= 0 ? 1 : -1;
    const directionY = dy >= 0 ? 1 : -1;
    const width = Math.max(Math.abs(dx), Math.abs(dy) * aspectRatio);
    const height = width / aspectRatio;

    return clampRect({
      x: directionX > 0 ? startX : startX - width,
      y: directionY > 0 ? startY : startY - height,
      width,
      height,
    });
  };

  const handleOverlayPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!imageViewport.width || !imageViewport.height) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const isInsideSelection =
      !!selectionStyle &&
      x >= (options.cropX / sourceInfo!.width) * imageViewport.width &&
      x <= ((options.cropX + options.cropWidth) / sourceInfo!.width) * imageViewport.width &&
      y >= (options.cropY / sourceInfo!.height) * imageViewport.height &&
      y <= ((options.cropY + options.cropHeight) / sourceInfo!.height) * imageViewport.height;

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      pointerId: event.pointerId,
      mode: isInsideSelection ? "move" : "draw",
      startX: x,
      startY: y,
      startRect: {
        x: (options.cropX / sourceInfo!.width) * imageViewport.width,
        y: (options.cropY / sourceInfo!.height) * imageViewport.height,
        width: (options.cropWidth / sourceInfo!.width) * imageViewport.width,
        height: (options.cropHeight / sourceInfo!.height) * imageViewport.height,
      },
    });

    if (!isInsideSelection) {
      updateCropFromDisplayRect(clampRect({ x, y, width: 1, height: 1 }));
    }
  };

  const handleOverlayPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(0, event.clientX - bounds.left), imageViewport.width);
    const y = Math.min(Math.max(0, event.clientY - bounds.top), imageViewport.height);

    if (dragState.mode === "draw") {
      updateCropFromDisplayRect(buildDrawRect(dragState.startX, dragState.startY, x, y));
      return;
    }

    const deltaX = x - dragState.startX;
    const deltaY = y - dragState.startY;
    updateCropFromDisplayRect(
      clampRect({
        x: dragState.startRect.x + deltaX,
        y: dragState.startRect.y + deltaY,
        width: dragState.startRect.width,
        height: dragState.startRect.height,
      })
    );
  };

  const endDrag = (pointerId: number, currentTarget: HTMLDivElement) => {
    if (dragState?.pointerId !== pointerId) {
      return;
    }

    currentTarget.releasePointerCapture(pointerId);
    setDragState(null);
  };

  const generatePreview = async () => {
    if (!inputPath) {
      setError("请先选择一张图片");
      return;
    }

    if (isIcoSquareInvalid) {
      setError("ICO 导出要求裁剪区域为 1:1 方形，请切换到 1:1 或图标模式");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const result = await invoke<ImageConversionPreviewResult>("generate_image_crop_preview", {
        inputPath,
        options: { ...options, outputSize: options.outputSize ?? null },
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

    if (isIcoSquareInvalid) {
      setError("ICO 导出要求裁剪区域为 1:1 方形，请切换到 1:1 或图标模式");
      return;
    }

    const outputPath = await save({
      title: "保存裁剪结果",
      defaultPath: getDefaultFileName(inputPath, "cropped", options.targetFormat),
      filters: [{ name: selectedFormat?.label ?? options.targetFormat.toUpperCase(), extensions: [getOutputExtension(options.targetFormat)] }],
    });

    if (!outputPath) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await invoke("save_cropped_image", { inputPath, outputPath, options: { ...options, outputSize: options.outputSize ?? null } });
    } catch (invokeError) {
      setError(invokeError instanceof Error ? invokeError.message : String(invokeError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageSection className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader title="图片裁剪" description="支持自由裁剪、固定比例裁剪和图标裁剪输出。" backTo="/" />
        <div className="grid gap-6 xl:grid-cols-[460px_minmax(0,1fr)]">
          <Card className="rounded-[1.5rem] border-border/60 bg-background/80">
            <CardHeader>
              <CardTitle className="text-xl">裁剪设置</CardTitle>
              <CardDescription>图标模式会自动锁定 1:1 比例，并支持方形输出和 ICO 导出。</CardDescription>
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
                <Label>裁剪模式</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "free", label: "自由" },
                    { value: "ratio-1-1", label: "1:1" },
                    { value: "ratio-4-3", label: "4:3" },
                    { value: "ratio-16-9", label: "16:9" },
                    { value: "icon", label: "图标模式" },
                  ].map((item) => (
                    <Button key={item.value} type="button" variant={cropMode === item.value ? "default" : "outline"} onClick={() => setAspectMode(item.value as CropMode)}>
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumberField label="X" value={options.cropX} onChange={(value) => updateOptions({ cropX: value })} />
                <NumberField label="Y" value={options.cropY} onChange={(value) => updateOptions({ cropY: value })} />
                <NumberField
                  label="宽度"
                  value={options.cropWidth}
                  onChange={(value) =>
                    updateOptions({
                      cropWidth: value,
                      cropHeight: applyAspectWidth(cropMode, value, options.cropHeight),
                    })
                  }
                />
                <NumberField label="高度" value={options.cropHeight} onChange={(value) => updateOptions({ cropHeight: value })} disabled={cropMode !== "free"} />
              </div>

              <div className="space-y-3">
                <Label>输出格式</Label>
                <div className="grid grid-cols-4 gap-2">
                  {IMAGE_CROP_FORMATS.map((format) => (
                    <Button
                      key={format.value}
                      type="button"
                      variant={options.targetFormat === format.value ? "default" : "outline"}
                      onClick={() => updateOptions({ targetFormat: format.value })}
                    >
                      {format.label}
                    </Button>
                  ))}
                </div>
                {isIcoSquareInvalid ? (
                  <div className="rounded-[1rem] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                    当前裁剪区域不是方形。ICO 导出会被阻止，请改成 1:1 或直接切换图标模式。
                  </div>
                ) : null}
              </div>

              {(options.targetFormat === "jpeg" || options.targetFormat === "webp") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="crop-quality">质量</Label>
                    <span className="text-sm font-medium">{options.quality}</span>
                  </div>
                  <Input id="crop-quality" type="range" min="1" max="100" value={options.quality} onChange={(event) => updateOptions({ quality: Number(event.target.value) })} className="px-0" />
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

              {(options.targetFormat === "jpeg" || cropMode === "icon") && (
                <div className="space-y-3">
                  <Label htmlFor="crop-background-color">背景色</Label>
                  <div className="flex items-center gap-3">
                    <Input id="crop-background-color" type="color" value={options.backgroundColor} onChange={(event) => updateOptions({ backgroundColor: event.target.value.toUpperCase() })} className="h-11 w-16 rounded-xl p-1" />
                    <Input value={options.backgroundColor} onChange={(event) => updateOptions({ backgroundColor: event.target.value.toUpperCase() })} className="font-mono" />
                  </div>
                </div>
              )}

              {(cropMode === "icon" || options.targetFormat === "ico") && (
                <div className="space-y-3">
                  <Label>目标尺寸</Label>
                  <div className="flex flex-wrap gap-2">
                    {ICO_SIZE_OPTIONS.map((size) => (
                      <Button
                        key={size}
                        type="button"
                        variant={(options.outputSize ?? options.icoSize) === size ? "default" : "outline"}
                        onClick={() => updateOptions({ outputSize: size, icoSize: size })}
                      >
                        {size}px
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void generatePreview()} disabled={isGenerating || !inputPath}>
                  <Scissors className="h-4 w-4" />
                  {isGenerating ? "生成中..." : "生成预览"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setOptions(DEFAULT_IMAGE_CROP_OPTIONS);
                    setCropMode("free");
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
                <CardTitle className="text-xl">可视化裁剪</CardTitle>
                <CardDescription>直接在原图上拖拽选区。拖空白区域重画，拖住选框可移动。</CardDescription>
              </CardHeader>
              <CardContent>
                {inputPath && sourceInfo ? (
                  <div className="space-y-4">
                    <div className={cn("flex min-h-[360px] items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 p-6", cropMode === "icon" ? "bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.14),transparent_58%),linear-gradient(135deg,rgba(15,23,42,0.06),rgba(148,163,184,0.12))]" : "bg-muted/20")}>
                      <div className="relative inline-block max-w-full">
                        <img
                          ref={imageRef}
                          src={sourceInfo.previewDataUrl}
                          alt="原图预览"
                          className={cn("block max-h-[520px] max-w-full select-none shadow-lg", cropMode === "icon" ? "rounded-[2rem]" : "rounded-xl")}
                          onLoad={handleImageLoad}
                          draggable={false}
                        />
                        {selectionStyle ? (
                          <div
                            className="absolute inset-0 cursor-crosshair touch-none"
                            onPointerDown={handleOverlayPointerDown}
                            onPointerMove={handleOverlayPointerMove}
                            onPointerUp={(event) => endDrag(event.pointerId, event.currentTarget)}
                            onPointerCancel={(event) => endDrag(event.pointerId, event.currentTarget)}
                          >
                            <div
                              className="absolute border-2 border-white bg-white/10 ring-1 ring-black/10"
                              style={selectionStyle}
                            >
                              <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[11px] font-medium text-white">
                                {options.cropWidth} × {options.cropHeight}
                              </div>
                              <div className="absolute bottom-2 right-2 rounded-full bg-black/70 p-1 text-white">
                                <Move className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <MetaItem label="X / Y" value={`${options.cropX} / ${options.cropY}`} />
                      <MetaItem label="裁剪区域" value={`${options.cropWidth} × ${options.cropHeight}`} />
                      <MetaItem label="裁剪模式" value={cropMode === "icon" ? "图标模式" : cropMode === "free" ? "自由" : cropMode.replace("ratio-", "")} />
                      <MetaItem label="原图尺寸" value={`${sourceInfo.width} × ${sourceInfo.height}`} />
                    </div>
                    {preview ? (
                      <div className="rounded-[1.4rem] border border-border/60 bg-background/75 p-4">
                        <div className="mb-3 text-sm font-medium">输出预览</div>
                        <div className="flex min-h-[220px] items-center justify-center rounded-[1rem] border border-dashed border-border/70 bg-muted/20 p-4">
                          <img src={preview.dataUrl} alt="裁剪输出预览" className="max-h-[220px] max-w-full rounded-xl shadow-lg" />
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <MetaItem label="输出尺寸" value={`${preview.outputWidth} × ${preview.outputHeight}`} />
                          <MetaItem label="输出格式" value={preview.outputFormat.toUpperCase()} />
                          <MetaItem label="预览格式" value={preview.previewFormat.toUpperCase()} />
                          <MetaItem label="输出体积" value={formatBytes(preview.estimatedBytes)} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-muted/20 px-6 text-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    <div className="mt-4 text-lg font-semibold">还没有加载原图</div>
                    <div className="mt-2 max-w-md text-sm text-muted-foreground">先选择图片，随后就可以直接在原图上拖拽裁剪框。</div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem] border-border/60 bg-background/80">
              <CardHeader>
                <CardTitle className="text-xl">原图信息</CardTitle>
                <CardDescription>用于校验裁剪坐标是否合理。</CardDescription>
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

function NumberField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" min="0" value={value} disabled={disabled} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} />
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
