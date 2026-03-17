import { useState, useCallback, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { FormatterWorkbench } from '@/components/features/FormatterWorkbench';
import { PageSection } from '@/components/layout/PageSection';
import { usePreferencesStore } from '@/stores/preferencesStore';
import type { JsonFormatConfig, JsonFormatResult, JsonValidateResult } from '@/types/json';

type JsonTreeValue = null | boolean | number | string | JsonTreeValue[] | { [key: string]: JsonTreeValue };

function isExpandable(value: JsonTreeValue): value is JsonTreeValue[] | { [key: string]: JsonTreeValue } {
  return typeof value === 'object' && value !== null;
}

function collectExpandablePaths(value: JsonTreeValue, path = 'root'): string[] {
  if (!isExpandable(value)) {
    return [];
  }

  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value);

  return [path, ...entries.flatMap(([key, child]) => collectExpandablePaths(child, `${path}.${key}`))];
}

function previewValue(value: JsonTreeValue): string {
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }
  if (value && typeof value === 'object') {
    return `Object(${Object.keys(value).length})`;
  }
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  return String(value);
}

function leafClass(value: JsonTreeValue): string {
  switch (typeof value) {
    case 'string':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'number':
      return 'text-sky-600 dark:text-sky-400';
    case 'boolean':
      return 'text-amber-600 dark:text-amber-400';
    default:
      return value === null ? 'text-muted-foreground' : 'text-foreground';
  }
}

function JsonTreeNode({
  label,
  value,
  path,
  depth = 0,
  expandedPaths,
  onToggle,
}: {
  label: string;
  value: JsonTreeValue;
  path: string;
  depth?: number;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
}) {
  const expandable = isExpandable(value);
  const isExpanded = expandedPaths.has(path);
  const children = expandable
    ? (Array.isArray(value)
      ? value.map((item, index) => [String(index), item] as const)
      : Object.entries(value))
    : [];

  return (
    <div>
      <div
        className="flex items-start gap-2 rounded-lg px-2 py-1 hover:bg-muted/50"
        style={{ paddingLeft: `${depth * 18 + 8}px` }}
      >
        {expandable ? (
          <button
            type="button"
            onClick={() => onToggle(path)}
            className="mt-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            {isExpanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="inline-block w-4" />
        )}
        <div className="min-w-0 flex-1 font-mono text-sm leading-6">
          <span className="text-violet-600 dark:text-violet-400">{label}</span>
          <span className="text-muted-foreground">: </span>
          {expandable ? (
            <span className="text-muted-foreground">{previewValue(value)}</span>
          ) : (
            <span className={leafClass(value)}>{previewValue(value)}</span>
          )}
        </div>
      </div>
      {expandable && isExpanded && (
        <div>
          {children.map(([childLabel, childValue]) => (
            <JsonTreeNode
              key={`${path}.${childLabel}`}
              label={Array.isArray(value) ? `[${childLabel}]` : childLabel}
              value={childValue}
              path={`${path}.${childLabel}`}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function JsonFormatterPage() {
  const {
    defaultIndent,
    autoCollapseInput,
    defaultJsonResultView,
    wrapLongLines,
  } = usePreferencesStore();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [validation, setValidation] = useState<JsonValidateResult | null>(null);
  const [config, setConfig] = useState<JsonFormatConfig>({
    indent: defaultIndent,
    sortKeys: false,
    mode: 'pretty',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const parsedOutput = useMemo<JsonTreeValue | null>(() => {
    if (!output) {
      return null;
    }

    try {
      return JSON.parse(output) as JsonTreeValue;
    } catch {
      return null;
    }
  }, [output]);

  const validateJson = useCallback(async () => {
    if (!input.trim()) {
      setValidation(null);
      return;
    }

    try {
      const result = await invoke<JsonValidateResult>('validate_json', { input });
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
      validateJson();
    } else {
      setValidation(null);
    }
  }, [input, validateJson]);

  const formatJson = useCallback(async () => {
    if (!input.trim()) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await invoke<JsonFormatResult>('format_json', { input, config });
      setOutput(result.success ? result.result : result.error || '格式化失败');
      setExpandedPaths(new Set());
      if (result.success && autoCollapseInput) {
        setIsInputCollapsed(true);
      }
    } catch (error) {
      setOutput(`错误: ${String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [input, config, autoCollapseInput]);

  const compactJson = useCallback(async () => {
    if (!input.trim()) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await invoke<JsonFormatResult>('compact_json', { input });
      setOutput(result.success ? result.result : result.error || '压缩失败');
      setExpandedPaths(new Set());
      if (result.success && autoCollapseInput) {
        setIsInputCollapsed(true);
      }
    } catch (error) {
      setOutput(`错误: ${String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [input, autoCollapseInput]);

  const clearInput = useCallback(() => {
    setInput('');
    setOutput('');
    setValidation(null);
    setExpandedPaths(new Set());
  }, []);

  const loadExample = useCallback(() => {
    setInput(JSON.stringify({
      name: 'DeskForge',
      version: '2.0.0',
      features: ['formatter-workbench', 'app-shell', 'preferences'],
      meta: {
        desktop: true,
        released: true,
      },
    }));
  }, []);

  const toggleNode = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (!parsedOutput) {
      return;
    }

    setExpandedPaths(new Set(collectExpandablePaths(parsedOutput)));
  }, [parsedOutput]);

  const collapseAll = useCallback(() => {
    setExpandedPaths(new Set());
  }, []);

  return (
    <PageSection>
      <FormatterWorkbench
        inputLabel="输入 JSON"
        inputDescription="支持格式化、压缩与树结构查看，适合调试接口响应和配置数据。"
        outputLanguage="json"
        outputDescription="JSON 结果可在代码视图和树结构视图之间切换。"
        input={input}
        onInputChange={setInput}
        output={output}
        validation={validation}
        isProcessing={isProcessing}
        isInputCollapsed={isInputCollapsed}
        onInputCollapseChange={setIsInputCollapsed}
        onPrimaryAction={formatJson}
        primaryActionLabel="格式化"
        onSecondaryAction={compactJson}
        secondaryActionLabel="压缩"
        onClear={clearInput}
        onLoadExample={loadExample}
        defaultOutputView={defaultJsonResultView}
        wrapLongLines={wrapLongLines}
        disablePrimaryAction={!validation?.isValid}
        disableSecondaryAction={!validation?.isValid}
        outputToolbar={
          parsedOutput ? (
            <>
              <Button size="sm" variant="outline" onClick={expandAll}>
                全部展开
              </Button>
              <Button size="sm" variant="outline" onClick={collapseAll}>
                全部收起
              </Button>
            </>
          ) : null
        }
        outputViews={[
          {
            key: 'tree',
            label: '树结构',
            disabled: !parsedOutput,
            content: parsedOutput ? (
              <div className="max-h-[26rem] overflow-auto rounded-2xl border border-border bg-muted/20 py-2">
                <JsonTreeNode
                  label="root"
                  value={parsedOutput}
                  path="root"
                  expandedPaths={expandedPaths}
                  onToggle={toggleNode}
                />
              </div>
            ) : (
              <div className="flex h-52 items-center justify-center rounded-2xl border border-border bg-muted/20 text-sm text-muted-foreground">
                当前结果不可解析为 JSON，无法显示树结构。
              </div>
            ),
          },
          {
            key: 'code',
            label: '代码',
          },
        ]}
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
              <span className="text-sm font-medium">排序 Keys</span>
              <Button
                size="sm"
                variant={config.sortKeys ? 'default' : 'outline'}
                onClick={() => setConfig((prev) => ({ ...prev, sortKeys: !prev.sortKeys }))}
              >
                {config.sortKeys ? '开启' : '关闭'}
              </Button>
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
            <p>1. JSON 输入会实时校验，非法内容不能触发格式化和压缩。</p>
            <p>2. 结果视图支持代码和树结构切换，树结构默认视图可在设置中配置。</p>
            <p>3. 可通过“聚焦结果”快速收起输入区，便于查看大对象层级。</p>
          </>
        }
      />
    </PageSection>
  );
}

