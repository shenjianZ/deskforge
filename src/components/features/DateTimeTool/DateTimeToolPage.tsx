import { useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { FormatterWorkbench } from '@/components/features/FormatterWorkbench';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageSection } from '@/components/layout/PageSection';
import { usePreferencesStore } from '@/stores/preferencesStore';
import type { DateTimeOutputFormat, DateTimeToolConfig, DateTimeToolResult, TimestampUnit } from '@/types/datetime';

const TIMESTAMP_UNITS: { value: TimestampUnit; label: string }[] = [
  { value: 'seconds', label: '秒' },
  { value: 'milliseconds', label: '毫秒' },
];

const OUTPUT_FORMATS: { value: DateTimeOutputFormat; label: string }[] = [
  { value: 'localDateTime', label: '常用格式' },
  { value: 'iso8601', label: 'ISO 8601' },
  { value: 'rfc2822', label: 'RFC 2822' },
];

export function DateTimeToolPage() {
  const { autoCollapseInput, wrapLongLines } = usePreferencesStore();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);
  const [config, setConfig] = useState<DateTimeToolConfig>({
    timestampUnit: 'milliseconds',
    useUtc: false,
    outputFormat: 'localDateTime',
  });

  const handleTimestampToDatetime = useCallback(async () => {
    if (!input.trim()) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await invoke<DateTimeToolResult>('timestamp_to_datetime', { input, config });
      setOutput(result.success ? result.result : result.error || '转换失败');
      if (result.success && autoCollapseInput) {
        setIsInputCollapsed(true);
      }
    } catch (error) {
      setOutput(`错误: ${String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [autoCollapseInput, config, input]);

  const handleDatetimeToTimestamp = useCallback(async () => {
    if (!input.trim()) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await invoke<DateTimeToolResult>('datetime_to_timestamp', { input, config });
      setOutput(result.success ? result.result : result.error || '转换失败');
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
  }, []);

  const loadExample = useCallback(() => {
    setInput('1742299200000');
    setOutput('');
  }, []);

  return (
    <PageSection className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader title="时间戳转换" backTo="/" />
        <FormatterWorkbench
          inputLabel="输入时间戳或日期时间"
          inputDescription="支持时间戳转日期时间，也支持日期时间反向转 Unix 时间戳。"
          outputLanguage="text"
          outputDescription="结果会同时返回 UTC、本地时间和 Unix 值，方便交叉核对。"
          input={input}
          onInputChange={setInput}
          output={output}
          validation={null}
          isProcessing={isProcessing}
          isInputCollapsed={isInputCollapsed}
          onInputCollapseChange={setIsInputCollapsed}
          onPrimaryAction={handleTimestampToDatetime}
          primaryActionLabel="时间戳 -> 日期"
          onSecondaryAction={handleDatetimeToTimestamp}
          secondaryActionLabel="日期 -> 时间戳"
          onClear={clearInput}
          onLoadExample={loadExample}
          wrapLongLines={wrapLongLines}
          configPanel={
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium">时间戳单位</span>
                <div className="flex flex-wrap gap-2">
                  {TIMESTAMP_UNITS.map((unit) => (
                    <Button
                      key={unit.value}
                      size="sm"
                      variant={config.timestampUnit === unit.value ? 'default' : 'outline'}
                      onClick={() => setConfig((prev) => ({ ...prev, timestampUnit: unit.value }))}
                    >
                      {unit.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium">输出格式</span>
                  <div className="flex flex-wrap gap-2">
                    {OUTPUT_FORMATS.map((format) => (
                      <Button
                        key={format.value}
                        size="sm"
                        variant={config.outputFormat === format.value ? 'default' : 'outline'}
                        onClick={() => setConfig((prev) => ({ ...prev, outputFormat: format.value }))}
                      >
                        {format.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">无时区日期按 UTC 解析</span>
                  <Button
                    size="sm"
                    variant={config.useUtc ? 'default' : 'outline'}
                    onClick={() => setConfig((prev) => ({ ...prev, useUtc: !prev.useUtc }))}
                  >
                    {config.useUtc ? '开启' : '关闭'}
                  </Button>
                </div>
              </div>
            </div>
          }
          helpContent={
            <>
              <p>1. 支持输入秒级或毫秒级时间戳，先选好单位再执行转换。</p>
              <p>2. 日期输入支持 `YYYY-MM-DD`、`YYYY-MM-DD HH:mm:ss`、ISO 8601、RFC 2822 等常见格式。</p>
              <p>3. 对于不带时区的日期字符串，可切换“按 UTC 解析”，避免本地时区导致的偏差。</p>
            </>
          }
        />
      </div>
    </PageSection>
  );
}
