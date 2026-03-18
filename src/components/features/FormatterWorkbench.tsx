import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeHighlighter } from '@/components/ui/code-highlighter';
import { Check, Copy, PanelLeftClose, PanelLeftOpen, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationState {
  isValid: boolean;
  errorMessage?: string;
  errorLine?: number;
  errorColumn?: number;
}

interface FormatterWorkbenchProps {
  inputLabel: string;
  inputDescription: string;
  outputLanguage: string;
  outputDescription: string;
  input: string;
  onInputChange: (value: string) => void;
  output: string;
  validation: ValidationState | null;
  isProcessing: boolean;
  isInputCollapsed: boolean;
  onInputCollapseChange: (value: boolean) => void;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
  onClear: () => void;
  onLoadExample: () => void;
  configPanel: React.ReactNode;
  helpContent: React.ReactNode;
  outputToolbar?: React.ReactNode;
  outputViews?: Array<{
    key: string;
    label: string;
    content?: React.ReactNode;
    disabled?: boolean;
  }>;
  defaultOutputView?: string;
  wrapLongLines?: boolean;
  disablePrimaryAction?: boolean;
  disableSecondaryAction?: boolean;
}

export function FormatterWorkbench({
  inputLabel,
  inputDescription,
  outputLanguage,
  outputDescription,
  input,
  onInputChange,
  output,
  validation,
  isProcessing,
  isInputCollapsed,
  onInputCollapseChange,
  onPrimaryAction,
  primaryActionLabel,
  onSecondaryAction,
  secondaryActionLabel,
  onClear,
  onLoadExample,
  configPanel,
  helpContent,
  outputToolbar,
  outputViews,
  defaultOutputView = 'code',
  wrapLongLines = false,
  disablePrimaryAction = false,
  disableSecondaryAction = false,
}: FormatterWorkbenchProps) {
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState(defaultOutputView);

  const lineCount = useMemo(() => (output ? output.split('\n').length : 0), [output]);

  const handleCopy = async () => {
    if (!output) {
      return;
    }

    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const views = outputViews ?? [
    {
      key: 'code',
      label: '代码',
      content: (
        <CodeHighlighter
          code={output}
          language={outputLanguage}
          className="w-full"
          maxHeight="26rem"
          showLineNumbers
          wrapLongLines={wrapLongLines}
        />
      ),
    },
  ];

  const activeViewKey = views.some((view) => view.key === activeView) ? activeView : views[0]?.key ?? 'code';

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Card className="border-border/60 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">配置</CardTitle>
        </CardHeader>
        <CardContent>{configPanel}</CardContent>
      </Card>

      <div className={cn('grid gap-6', isInputCollapsed ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]')}>
        {!isInputCollapsed && (
          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{inputLabel}</CardTitle>
                  <CardDescription>{inputDescription}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={onLoadExample} className="gap-2">
                    <Wand2 className="h-4 w-4" />
                    示例
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onClear} disabled={!input}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(event) => onInputChange(event.target.value)}
                  className="min-h-[28rem] w-full rounded-2xl border border-border bg-muted/30 p-4 font-mono text-sm shadow-inner outline-none ring-0 transition focus:border-primary"
                  placeholder={`在此输入${inputLabel.replace('输入', '')}...`}
                  spellCheck={false}
                />
                {validation && (
                  <div className="absolute right-3 top-3">
                    <Badge variant={validation.isValid ? 'default' : 'destructive'}>
                      {validation.isValid ? '有效' : '无效'}
                    </Badge>
                  </div>
                )}
              </div>

              {validation && !validation.isValid && validation.errorMessage && (
                <div className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <div className="font-medium">{validation.errorMessage}</div>
                  {(validation.errorLine || validation.errorColumn) && (
                    <div className="mt-1 text-xs text-destructive/80">
                      位置: 行 {validation.errorLine ?? '-'}，列 {validation.errorColumn ?? '-'}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button onClick={onPrimaryAction} disabled={disablePrimaryAction || isProcessing} className="gap-2">
                  <Sparkles className={cn('h-4 w-4', isProcessing && 'animate-spin')} />
                  {isProcessing ? '处理中...' : primaryActionLabel}
                </Button>
                {onSecondaryAction && secondaryActionLabel && (
                  <Button
                    onClick={onSecondaryAction}
                    disabled={disableSecondaryAction || isProcessing}
                    variant="outline"
                  >
                    {secondaryActionLabel}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">格式化结果</CardTitle>
                {outputDescription ? <CardDescription>{outputDescription}</CardDescription> : null}
              </div>
              <div className="flex items-center gap-2">
                {outputToolbar}
                <Button size="sm" variant="outline" onClick={handleCopy} disabled={!output} className="gap-2">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? '已复制' : '复制'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onInputCollapseChange(!isInputCollapsed)}
                  className="gap-2"
                >
                  {isInputCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                  {isInputCollapsed ? '显示输入' : '聚焦结果'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={activeViewKey} onValueChange={setActiveView}>
              <TabsList>
                {views.map((view) => (
                  <TabsTrigger key={view.key} value={view.key} disabled={'disabled' in view ? view.disabled : false}>
                    {view.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {views.map((view) => (
                <TabsContent key={view.key} value={view.key}>
                  {view.content ?? (
                    <CodeHighlighter
                      code={output}
                      language={outputLanguage}
                      className="w-full"
                      maxHeight="26rem"
                      showLineNumbers
                      wrapLongLines={wrapLongLines}
                    />
                  )}
                </TabsContent>
              ))}
            </Tabs>

            {output && (
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>字符数: {output.length}</span>
                <span>行数: {lineCount}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">{helpContent}</CardContent>
      </Card>
    </div>
  );
}
