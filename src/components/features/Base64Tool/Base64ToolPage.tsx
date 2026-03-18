import { useCallback, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { FormatterWorkbench } from '@/components/features/FormatterWorkbench';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageSection } from '@/components/layout/PageSection';
import { usePreferencesStore } from '@/stores/preferencesStore';
import type { Base64ProcessConfig, Base64ProcessResult, Base64ValidateResult, Base64Variant } from '@/types/base64';

const VARIANTS: { value: Base64Variant; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'urlSafe', label: 'URL Safe' },
];

export function Base64ToolPage() {
  const { autoCollapseInput, wrapLongLines } = usePreferencesStore();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);
  const [decodeValidation, setDecodeValidation] = useState<Base64ValidateResult | null>(null);
  const [config, setConfig] = useState<Base64ProcessConfig>({
    variant: 'standard',
    padding: true,
  });

  const validation = useMemo(() => {
    if (!input.trim()) {
      return null;
    }

    return decodeValidation
      ? {
          isValid: decodeValidation.isValid,
          errorMessage: decodeValidation.errorMessage,
        }
      : null;
  }, [decodeValidation, input]);

  const validateDecodeInput = useCallback(async () => {
    if (!input.trim()) {
      setDecodeValidation(null);
      return;
    }

    try {
      const result = await invoke<Base64ValidateResult>('validate_base64', { input, config });
      setDecodeValidation(result);
    } catch (error) {
      setDecodeValidation({
        isValid: false,
        errorMessage: `校验失败: ${String(error)}`,
      });
    }
  }, [config, input]);

  const handleEncode = useCallback(async () => {
    if (!input) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await invoke<Base64ProcessResult>('encode_base64', { input, config });
      setOutput(result.success ? result.result : result.error || '编码失败');
      if (result.success && autoCollapseInput) {
        setIsInputCollapsed(true);
      }
    } catch (error) {
      setOutput(`错误: ${String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [autoCollapseInput, config, input]);

  const handleDecode = useCallback(async () => {
    if (!input.trim()) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await invoke<Base64ProcessResult>('decode_base64', { input, config });
      setOutput(result.success ? result.result : result.error || '解码失败');
      if (result.success && autoCollapseInput) {
        setIsInputCollapsed(true);
      }
    } catch (error) {
      setOutput(`错误: ${String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [autoCollapseInput, config, input]);

  const clearInput = useCallback(() => {
    setInput('');
    setOutput('');
    setDecodeValidation(null);
  }, []);

  const loadExample = useCallback(() => {
    setInput('DeskForge Base64 Example');
    setOutput('');
    setDecodeValidation(null);
  }, []);

  return (
    <PageSection className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader title="Base64 编解码" backTo="/" />
        <FormatterWorkbench
          inputLabel="输入文本或 Base64"
          inputDescription="适合快速完成文本编码、URL Safe 编码和 UTF-8 文本解码。"
          outputLanguage="text"
          outputDescription="输出区统一支持复制、统计和聚焦结果。"
          input={input}
          onInputChange={(value) => {
            setInput(value);
            setDecodeValidation(null);
          }}
          output={output}
          validation={validation}
          isProcessing={isProcessing}
          isInputCollapsed={isInputCollapsed}
          onInputCollapseChange={setIsInputCollapsed}
          onPrimaryAction={handleEncode}
          primaryActionLabel="编码"
          onSecondaryAction={handleDecode}
          secondaryActionLabel="解码"
          onClear={clearInput}
          onLoadExample={loadExample}
          wrapLongLines={wrapLongLines}
          configPanel={
            <div className="space-y-4">
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
                <Button size="sm" variant="outline" onClick={() => void validateDecodeInput()} disabled={!input.trim()}>
                  校验 Base64
                </Button>
              </div>
            </div>
          }
          helpContent={
            <>
              <p>1. 编码输入按 UTF-8 文本处理，适合处理接口签名、调试参数和简单密文片段。</p>
              <p>2. 解码结果当前只支持 UTF-8 文本，二进制内容会提示错误而不会输出乱码。</p>
              <p>3. 切换 Standard 与 URL Safe 后，可手动点“校验 Base64”快速确认当前输入是否合法。</p>
            </>
          }
        />
      </div>
    </PageSection>
  );
}
