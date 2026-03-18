import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { FormatterWorkbench } from '@/components/features/FormatterWorkbench';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageSection } from '@/components/layout/PageSection';
import { usePreferencesStore } from '@/stores/preferencesStore';
import type { XmlFormatConfig, XmlFormatResult, XmlValidateResult } from '@/types/xml';

export function XmlFormatterPage() {
  const { defaultIndent, autoCollapseInput, wrapLongLines } = usePreferencesStore();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [validation, setValidation] = useState<XmlValidateResult | null>(null);
  const [config, setConfig] = useState<XmlFormatConfig>({
    indent: defaultIndent,
    mode: 'pretty',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);

  const validateXml = useCallback(async () => {
    if (!input.trim()) {
      setValidation(null);
      return;
    }

    try {
      const result = await invoke<XmlValidateResult>('validate_xml', { input });
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
      validateXml();
    } else {
      setValidation(null);
    }
  }, [input, validateXml]);

  const formatXml = useCallback(async () => {
    if (!input.trim()) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await invoke<XmlFormatResult>('format_xml', { input, config });
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

  const compactXml = useCallback(async () => {
    if (!input.trim()) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await invoke<XmlFormatResult>('compact_xml', { input });
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
    setInput('<?xml version="1.0" encoding="UTF-8"?><root><item id="1"><name>示例</name><value>测试</value></item></root>');
  }, []);

  const clearInput = useCallback(() => {
    setInput('');
    setOutput('');
    setValidation(null);
  }, []);

  return (
    <PageSection className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader title="XML 格式化" backTo="/" />
        <FormatterWorkbench
          inputLabel="输入 XML"
          inputDescription="适合配置文件、接口报文和结构化数据整理。"
          outputLanguage="xml"
          outputDescription="结果区提供高亮、复制与布局聚焦。"
          input={input}
          onInputChange={setInput}
          output={output}
          validation={validation}
          isProcessing={isProcessing}
          isInputCollapsed={isInputCollapsed}
          onInputCollapseChange={setIsInputCollapsed}
          onPrimaryAction={formatXml}
          primaryActionLabel="格式化"
          onSecondaryAction={compactXml}
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
              <p>1. 粘贴 XML 后自动校验结构合法性。</p>
              <p>2. 根据场景选择可读性优先的格式化或传输优先的压缩。</p>
              <p>3. 输入区可折叠，方便对长报文进行结果比对。</p>
            </>
          }
        />
      </div>
    </PageSection>
  );
}
