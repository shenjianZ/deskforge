import { useCallback, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { Download, FolderOpen, Image as ImageIcon, Link2, TextCursorInput } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormatterWorkbench } from '@/components/features/FormatterWorkbench';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageSection } from '@/components/layout/PageSection';
import { usePreferencesStore } from '@/stores/preferencesStore';
import type {
  Base64ImageResult,
  Base64ImageTextView,
  Base64ProcessConfig,
  Base64ProcessResult,
  Base64ToolMode,
  Base64ValidateResult,
  Base64Variant,
} from '@/types/base64';
import { BASE64_IMAGE_INPUT_EXTENSIONS } from '@/types/base64';

const VARIANTS: { value: Base64Variant; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'urlSafe', label: 'URL Safe' },
];

const IMAGE_OUTPUT_TEXT_VIEW_OPTIONS: { value: Base64ImageTextView; label: string }[] = [
  { value: 'dataUrl', label: 'Data URL' },
  { value: 'base64', label: '纯 Base64' },
];

const IMAGE_EXAMPLE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';

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
  if (path.length <= 64) {
    return path;
  }

  return `${path.slice(0, 28)}...${path.slice(-28)}`;
}

export function Base64ToolPage() {
  const { autoCollapseInput, wrapLongLines } = usePreferencesStore();

  const [mode, setMode] = useState<Base64ToolMode>('text');

  const [textInput, setTextInput] = useState('');
  const [textOutput, setTextOutput] = useState('');
  const [isTextProcessing, setIsTextProcessing] = useState(false);
  const [isTextInputCollapsed, setIsTextInputCollapsed] = useState(false);
  const [decodeValidation, setDecodeValidation] = useState<Base64ValidateResult | null>(null);
  const [config, setConfig] = useState<Base64ProcessConfig>({
    variant: 'standard',
    padding: true,
  });

  const [imageInput, setImageInput] = useState('');
  const [selectedImagePath, setSelectedImagePath] = useState('');
  const [imageResult, setImageResult] = useState<Base64ImageResult | null>(null);
  const [imageValidation, setImageValidation] = useState<Base64ValidateResult | null>(null);
  const [imageTextView, setImageTextView] = useState<Base64ImageTextView>('dataUrl');
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [isImageSaving, setIsImageSaving] = useState(false);
  const [isImageInputCollapsed, setIsImageInputCollapsed] = useState(false);

  const textValidation = useMemo(() => {
    if (!textInput.trim()) {
      return null;
    }

    return decodeValidation
      ? {
          isValid: decodeValidation.isValid,
          errorMessage: decodeValidation.errorMessage,
        }
      : null;
  }, [decodeValidation, textInput]);

  const imageOutput = useMemo(() => {
    if (!imageResult) {
      return '';
    }

    return imageTextView === 'dataUrl' ? imageResult.dataUrl : imageResult.base64;
  }, [imageResult, imageTextView]);

  const imageOutputDescription = useMemo(() => {
    if (!imageResult) {
      return '结果区会展示 Base64 文本和图片预览，便于复制、校验和另存为。';
    }

    return `${imageResult.format.toUpperCase()} · ${imageResult.width} × ${imageResult.height} · ${formatBytes(imageResult.byteSize)}`;
  }, [imageResult]);

  const validateDecodeInput = useCallback(async () => {
    if (!textInput.trim()) {
      setDecodeValidation(null);
      return;
    }

    try {
      const result = await invoke<Base64ValidateResult>('validate_base64', { input: textInput, config });
      setDecodeValidation(result);
    } catch (error) {
      setDecodeValidation({
        isValid: false,
        errorMessage: `校验失败: ${String(error)}`,
      });
    }
  }, [config, textInput]);

  const handleEncode = useCallback(async () => {
    if (!textInput) {
      return;
    }

    setIsTextProcessing(true);
    try {
      const result = await invoke<Base64ProcessResult>('encode_base64', { input: textInput, config });
      setTextOutput(result.success ? result.result : result.error || '编码失败');
      if (result.success && autoCollapseInput) {
        setIsTextInputCollapsed(true);
      }
    } catch (error) {
      setTextOutput(`错误: ${String(error)}`);
    } finally {
      setIsTextProcessing(false);
    }
  }, [autoCollapseInput, config, textInput]);

  const handleDecode = useCallback(async () => {
    if (!textInput.trim()) {
      return;
    }

    setIsTextProcessing(true);
    try {
      const result = await invoke<Base64ProcessResult>('decode_base64', { input: textInput, config });
      setTextOutput(result.success ? result.result : result.error || '解码失败');
      if (result.success && autoCollapseInput) {
        setIsTextInputCollapsed(true);
      }
    } catch (error) {
      setTextOutput(`错误: ${String(error)}`);
    } finally {
      setIsTextProcessing(false);
    }
  }, [autoCollapseInput, config, textInput]);

  const handlePickImage = useCallback(async () => {
    try {
      const selected = await open({
        title: '选择待编码图片',
        multiple: false,
        filters: [{ name: '图片', extensions: [...BASE64_IMAGE_INPUT_EXTENSIONS] }],
      });

      if (!selected || typeof selected !== 'string') {
        return;
      }

      setSelectedImagePath(selected);
      setImageValidation(null);
    } catch (error) {
      setImageValidation({
        isValid: false,
        errorMessage: `选择图片失败: ${String(error)}`,
      });
    }
  }, []);

  const handleEncodeImage = useCallback(async () => {
    if (!selectedImagePath) {
      setImageValidation({
        isValid: false,
        errorMessage: '请先选择一张图片',
      });
      return;
    }

    setIsImageProcessing(true);
    setImageValidation(null);

    try {
      const result = await invoke<Base64ImageResult>('encode_image_to_base64', { inputPath: selectedImagePath });
      setImageResult(result);
      setImageInput(result.dataUrl);
      if (autoCollapseInput) {
        setIsImageInputCollapsed(true);
      }
    } catch (error) {
      setImageResult(null);
      setImageValidation({
        isValid: false,
        errorMessage: String(error),
      });
    } finally {
      setIsImageProcessing(false);
    }
  }, [autoCollapseInput, selectedImagePath]);

  const handleDecodeImage = useCallback(async () => {
    if (!imageInput.trim()) {
      setImageValidation({
        isValid: false,
        errorMessage: '请输入 Base64 或 Data URL',
      });
      return;
    }

    setIsImageProcessing(true);
    setImageValidation(null);

    try {
      const result = await invoke<Base64ImageResult>('decode_base64_to_image', { input: imageInput });
      setImageResult(result);
      if (autoCollapseInput) {
        setIsImageInputCollapsed(true);
      }
    } catch (error) {
      setImageResult(null);
      setImageValidation({
        isValid: false,
        errorMessage: String(error),
      });
    } finally {
      setIsImageProcessing(false);
    }
  }, [autoCollapseInput, imageInput]);

  const handleSaveImage = useCallback(async () => {
    if (!imageResult) {
      return;
    }

    const outputPath = await save({
      title: '保存图片',
      defaultPath: `decoded-image.${imageResult.suggestedExtension}`,
      filters: [{ name: imageResult.format.toUpperCase(), extensions: [imageResult.suggestedExtension] }],
    });

    if (!outputPath) {
      return;
    }

    setIsImageSaving(true);
    try {
      await invoke('save_base64_image', { outputPath, input: imageOutput });
    } catch (error) {
      setImageValidation({
        isValid: false,
        errorMessage: `保存图片失败: ${String(error)}`,
      });
    } finally {
      setIsImageSaving(false);
    }
  }, [imageOutput, imageResult]);

  const clearTextInput = useCallback(() => {
    setTextInput('');
    setTextOutput('');
    setDecodeValidation(null);
  }, []);

  const clearImageInput = useCallback(() => {
    setImageInput('');
    setSelectedImagePath('');
    setImageResult(null);
    setImageValidation(null);
    setImageTextView('dataUrl');
  }, []);

  const loadTextExample = useCallback(() => {
    setTextInput('DeskForge Base64 Example');
    setTextOutput('');
    setDecodeValidation(null);
  }, []);

  const loadImageExample = useCallback(() => {
    setImageInput(IMAGE_EXAMPLE_DATA_URL);
    setImageResult(null);
    setImageValidation(null);
    setSelectedImagePath('');
  }, []);

  const imageConfigPanel = (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={mode === 'text' ? 'default' : 'outline'}
          onClick={() => setMode('text')}
        >
          <TextCursorInput className="h-4 w-4" />
          文本模式
        </Button>
        <Button
          size="sm"
          variant={mode === 'image' ? 'default' : 'outline'}
          onClick={() => setMode('image')}
        >
          <ImageIcon className="h-4 w-4" />
          图片模式
        </Button>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">图片文件</span>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void handlePickImage()}>
              <FolderOpen className="h-4 w-4" />
              选择图片
            </Button>
            <Button size="sm" onClick={() => void handleEncodeImage()} disabled={!selectedImagePath || isImageProcessing}>
              <Link2 className="h-4 w-4" />
              从图片编码
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          {selectedImagePath ? formatPath(selectedImagePath) : '支持 png / jpg / jpeg / jfif / webp / bmp / tif / tiff / ico / gif'}
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">文本输出</span>
          <div className="flex flex-wrap gap-2">
            {IMAGE_OUTPUT_TEXT_VIEW_OPTIONS.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={imageTextView === option.value ? 'default' : 'outline'}
                onClick={() => setImageTextView(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">图片模式支持“文件编码”和“Base64 / Data URL 解码”两条路径，结果区会同步显示文本与预览。</div>
      </div>
    </div>
  );

  const imageHelpContent = (
    <>
      <p>1. 支持把本地位图图片编码为纯 Base64 或 Data URL，适合嵌入 HTML、CSS、Markdown 和调试请求体。</p>
      <p>2. 解码时可直接粘贴 `data:image/...;base64,...`，也可以只粘贴纯 Base64，系统会自动识别图片格式。</p>
      <p>3. “另存为”会按原始解码字节写入文件，不会额外转码、压缩或改尺寸。</p>
    </>
  );

  const textConfigPanel = (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={mode === 'text' ? 'default' : 'outline'}
          onClick={() => setMode('text')}
        >
          <TextCursorInput className="h-4 w-4" />
          文本模式
        </Button>
        <Button
          size="sm"
          variant={mode === 'image' ? 'default' : 'outline'}
          onClick={() => setMode('image')}
        >
          <ImageIcon className="h-4 w-4" />
          图片模式
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">变体</span>
        <div className="flex flex-wrap gap-2">
          {VARIANTS.map((variant) => (
            <Button
              key={variant.value}
              size="sm"
              variant={config.variant === variant.value ? 'default' : 'outline'}
              onClick={() => setConfig((prev) => ({ ...prev, variant: variant.value }))}
            >
              {variant.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">填充符</span>
        <Button
          size="sm"
          variant={config.padding ? 'default' : 'outline'}
          onClick={() => setConfig((prev) => ({ ...prev, padding: !prev.padding }))}
        >
          {config.padding ? '保留 =' : '移除 ='}
        </Button>
        <Button size="sm" variant="outline" onClick={() => void validateDecodeInput()} disabled={!textInput.trim()}>
          校验 Base64
        </Button>
      </div>
    </div>
  );

  if (mode === 'image') {
    return (
      <PageSection className="space-y-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <PageHeader title="Base64 编解码" description="在文本编解码之外，额外支持图片文件与 Base64 / Data URL 互转。" backTo="/" />
          <FormatterWorkbench
            key="image-mode"
            inputLabel="输入 Base64 / Data URL"
            inputDescription="直接粘贴图片 Base64 或 Data URL，也可以先在上方选择图片后执行编码。"
            outputLanguage="text"
            outputDescription={imageOutputDescription}
            input={imageInput}
            onInputChange={(value) => {
              setImageInput(value);
              setImageValidation(null);
            }}
            output={imageOutput}
            validation={
              imageValidation
                ? {
                    isValid: imageValidation.isValid,
                    errorMessage: imageValidation.errorMessage,
                  }
                : null
            }
            isProcessing={isImageProcessing}
            isInputCollapsed={isImageInputCollapsed}
            onInputCollapseChange={setIsImageInputCollapsed}
            onPrimaryAction={handleDecodeImage}
            primaryActionLabel="解码为图片"
            onSecondaryAction={handleEncodeImage}
            secondaryActionLabel="从已选图片编码"
            onClear={clearImageInput}
            onLoadExample={loadImageExample}
            wrapLongLines={wrapLongLines}
            disableSecondaryAction={!selectedImagePath}
            configPanel={imageConfigPanel}
            outputToolbar={
              <Button variant="outline" size="sm" onClick={() => void handleSaveImage()} disabled={!imageResult || isImageSaving}>
                <Download className="h-4 w-4" />
                {isImageSaving ? '保存中...' : '另存为'}
              </Button>
            }
            outputViews={[
              {
                key: 'text',
                label: '文本',
              },
              {
                key: 'image',
                label: '图片',
                content: imageResult ? (
                  <div className="space-y-4">
                    <div className="flex min-h-[24rem] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 p-6">
                      <img src={imageResult.dataUrl} alt="Base64 图片预览" className="max-h-[28rem] max-w-full rounded-xl shadow-lg" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <MetaItem label="格式" value={imageResult.format.toUpperCase()} />
                      <MetaItem label="MIME" value={imageResult.mime} />
                      <MetaItem label="尺寸" value={`${imageResult.width} × ${imageResult.height}`} />
                      <MetaItem label="体积" value={formatBytes(imageResult.byteSize)} />
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 text-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    <div className="mt-4 text-lg font-semibold">还没有图片结果</div>
                    <div className="mt-2 max-w-md text-sm text-muted-foreground">粘贴 Base64 / Data URL 后点击“解码为图片”，或先选择本地图片再点击“从已选图片编码”。</div>
                  </div>
                ),
              },
            ]}
            defaultOutputView="image"
            helpContent={imageHelpContent}
          />
        </div>
      </PageSection>
    );
  }

  return (
    <PageSection className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader title="Base64 编解码" backTo="/" />
        <FormatterWorkbench
          key="text-mode"
          inputLabel="输入文本或 Base64"
          inputDescription="适合快速完成文本编码、URL Safe 编码和 UTF-8 文本解码。"
          outputLanguage="text"
          outputDescription="输出区统一支持复制、统计和聚焦结果。"
          input={textInput}
          onInputChange={(value) => {
            setTextInput(value);
            setDecodeValidation(null);
          }}
          output={textOutput}
          validation={textValidation}
          isProcessing={isTextProcessing}
          isInputCollapsed={isTextInputCollapsed}
          onInputCollapseChange={setIsTextInputCollapsed}
          onPrimaryAction={handleEncode}
          primaryActionLabel="编码"
          onSecondaryAction={handleDecode}
          secondaryActionLabel="解码"
          onClear={clearTextInput}
          onLoadExample={loadTextExample}
          wrapLongLines={wrapLongLines}
          configPanel={textConfigPanel}
          helpContent={
            <>
              <p>1. 编码输入按 UTF-8 文本处理，适合处理接口签名、调试参数和简单密文片段。</p>
              <p>2. 解码结果当前只支持 UTF-8 文本，二进制内容会提示错误而不会输出乱码。</p>
              <p>3. 若需要处理图片 Base64，请切换到上方“图片模式”。</p>
            </>
          }
        />
      </div>
    </PageSection>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-border/60 bg-background/70 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 break-all text-sm font-semibold">{value}</div>
    </div>
  );
}
