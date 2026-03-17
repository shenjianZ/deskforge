import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { FormatterWorkbench } from '@/components/features/FormatterWorkbench';
import { PageSection } from '@/components/layout/PageSection';
import { usePreferencesStore } from '@/stores/preferencesStore';
import type { HtmlFormatConfig, HtmlFormatResult, HtmlValidateResult } from '@/types/html';

export function HtmlFormatterPage() {
  const { defaultIndent, autoCollapseInput, wrapLongLines } = usePreferencesStore();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [validation, setValidation] = useState<HtmlValidateResult | null>(null);
  const [config, setConfig] = useState<HtmlFormatConfig>({
    indent: defaultIndent,
    mode: 'pretty',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);

  const validateHtml = useCallback(async () => {
    if (!input.trim()) {
      setValidation(null);
      return;
    }

    try {
      const result = await invoke<HtmlValidateResult>('validate_html', { input });
      setValidation(result);
    } catch (error) {
      setValidation({
        isValid: false,
        errorMessage: `验证失败: ${String(error)}`,
      });
    }
  }, [input]);

  useEffect(() => {
    setConfig((prev) => ({ ...prev, indent: defaultIndent }));
  }, [defaultIndent]);

  useEffect(() => {
    if (input.trim()) {
      validateHtml();
    } else {
      setValidation(null);
    }
  }, [input, validateHtml]);

  const formatHtml = useCallback(async () => {
    if (!input.trim()) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await invoke<HtmlFormatResult>('format_html', { input, config });
      setOutput(result.success ? result.result : result.error || '格式化失败');
      if (result.success && autoCollapseInput) {
        setIsInputCollapsed(true);
      }
    } catch (error) {
      setOutput(`错误: ${String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [input, config, autoCollapseInput]);

  const compactHtml = useCallback(async () => {
    if (!input.trim()) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await invoke<HtmlFormatResult>('compact_html', { input });
      setOutput(result.success ? result.result : result.error || '压缩失败');
      if (result.success && autoCollapseInput) {
        setIsInputCollapsed(true);
      }
    } catch (error) {
      setOutput(`错误: ${String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [input, autoCollapseInput]);

  const loadExample = useCallback(() => {
    setInput(`<!DOCTYPE html>
<html><head><title>示例</title></head><body><div class="container"><h1>欢迎</h1><p>这是一个示例。</p></div></body></html>`);
  }, []);

  const clearInput = useCallback(() => {
    setInput('');
    setOutput('');
    setValidation(null);
  }, []);

  return (
    <PageSection>
      <FormatterWorkbench
        inputLabel="输入 HTML"
        inputDescription="粘贴原始 HTML，实时校验后再格式化或压缩。"
        outputLanguage="html"
        outputDescription="统一结果区支持复制、聚焦结果和统计信息。"
        input={input}
        onInputChange={setInput}
        output={output}
        validation={validation}
        isProcessing={isProcessing}
        isInputCollapsed={isInputCollapsed}
        onInputCollapseChange={setIsInputCollapsed}
        onPrimaryAction={formatHtml}
        primaryActionLabel="格式化"
        onSecondaryAction={compactHtml}
        secondaryActionLabel="压缩"
        onClear={clearInput}
        onLoadExample={loadExample}
        wrapLongLines={wrapLongLines}
        configPanel={
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">缩进</span>
              <div className="flex gap-2">
                {[2, 4].map((spaces) => (
                  <Button
                    key={spaces}
                    size="sm"
                    variant={config.indent === spaces ? 'default' : 'outline'}
                    onClick={() => setConfig((prev) => ({ ...prev, indent: spaces }))}
                  >
                    {spaces} 空格
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">模式</span>
              <div className="flex gap-2">
                {(['pretty', 'compact'] as const).map((mode) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={config.mode === mode ? 'default' : 'outline'}
                    onClick={() => setConfig((prev) => ({ ...prev, mode }))}
                  >
                    {mode === 'pretty' ? '美化' : '压缩'}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        }
        helpContent={
          <>
            <p>1. 在输入区粘贴 HTML，系统会自动做基础校验。</p>
            <p>2. 根据偏好选择缩进和模式，点击格式化或压缩。</p>
            <p>3. 结果区支持复制、统计信息和长行换行策略。</p>
          </>
        }
      />
    </PageSection>
  );
}
