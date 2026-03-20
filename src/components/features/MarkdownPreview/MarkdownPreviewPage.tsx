import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Download, FileCode2, FolderTree, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageSection } from '@/components/layout/PageSection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeHighlighter } from '@/components/ui/code-highlighter';
import { usePreferencesStore } from '@/stores/preferencesStore';
import {
  MARKDOWN_EXPORT_STYLE,
  MARKDOWN_PREVIEW_EXAMPLE,
  type MarkdownPreviewStats,
  type ResolvedMarkdownAsset,
} from '@/types/markdown';
import { cn } from '@/lib/utils';

const MERMAID_THEME = 'neutral';

const HTML_IMAGE_PATTERN = /<img\b([^>]*?)\bsrc=(['"])(.*?)\2([^>]*)>/gi;

function collectStats(source: string): MarkdownPreviewStats {
  return {
    characterCount: source.length,
    lineCount: source ? source.split('\n').length : 0,
    headingCount: source.match(/^#{1,6}\s+/gm)?.length ?? 0,
  };
}

function isRemoteAssetPath(value: string) {
  return /^(https?:|data:|mailto:|#)/i.test(value);
}

function normalizeMarkdownDestination(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function extractMarkdownImageTokens(source: string) {
  const tokens: Array<{
    start: number;
    end: number;
    alt: string;
    rawTarget: string;
    actualPath: string;
    full: string;
  }> = [];

  let cursor = 0;

  while (cursor < source.length) {
    const start = source.indexOf('![', cursor);
    if (start === -1) {
      break;
    }

    const delimiter = source.indexOf('](', start + 2);
    if (delimiter === -1) {
      break;
    }

    const alt = source.slice(start + 2, delimiter);
    let targetStart = delimiter + 2;
    let end = -1;

    if (source[targetStart] === '<') {
      const angleEnd = source.indexOf('>', targetStart + 1);
      if (angleEnd === -1) {
        cursor = delimiter + 2;
        continue;
      }

      const closeParen = source.indexOf(')', angleEnd + 1);
      if (closeParen === -1) {
        cursor = angleEnd + 1;
        continue;
      }

      end = closeParen;
    } else {
      let depth = 0;
      for (let index = targetStart; index < source.length; index += 1) {
        const char = source[index];
        if (char === '\n') {
          break;
        }
        if (char === '(') {
          depth += 1;
          continue;
        }
        if (char === ')') {
          if (depth === 0) {
            end = index;
            break;
          }
          depth -= 1;
        }
      }

      if (end === -1) {
        cursor = targetStart;
        continue;
      }
    }

    const rawTarget = source.slice(targetStart, end);
    const full = source.slice(start, end + 1);
    tokens.push({
      start,
      end: end + 1,
      alt,
      rawTarget,
      actualPath: normalizeMarkdownDestination(rawTarget),
      full,
    });

    cursor = end + 1;
  }

  return tokens;
}

async function resolveMarkdownAssets(source: string, baseDir: string) {
  const candidates = new Map<string, string>();
  const markdownTokens = extractMarkdownImageTokens(source);

  for (const token of markdownTokens) {
    const assetPath = token.actualPath;
    if (assetPath && !isRemoteAssetPath(assetPath)) {
      candidates.set(assetPath, assetPath);
    }
  }

  for (const match of source.matchAll(HTML_IMAGE_PATTERN)) {
    const assetPath = (match[3] ?? '').trim();
    if (assetPath && !isRemoteAssetPath(assetPath)) {
      candidates.set(assetPath, assetPath);
    }
  }

  if (candidates.size === 0) {
    return { resolvedMap: {} as Record<string, string>, warnings: [] as string[] };
  }

  const resolvedMap: Record<string, string> = {};
  const warnings: string[] = [];

  for (const assetPath of candidates.values()) {
    try {
      const result = await invoke<ResolvedMarkdownAsset>('resolve_markdown_asset', {
        assetPath,
        baseDir: baseDir || null,
      });
      resolvedMap[assetPath] = result.dataUrl;
    } catch (error) {
      resolvedMap[assetPath] = '';
      warnings.push(`${assetPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { resolvedMap, warnings };
}

function buildExportHtml(content: string) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Markdown 导出</title>
    <style>${MARKDOWN_EXPORT_STYLE}</style>
  </head>
  <body>
    <main class="md-export">${content}</main>
  </body>
</html>`;
}

function encodeBytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function MermaidBlock({ code }: { code: string }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const blockId = useId().replace(/:/g, '-');

  useEffect(() => {
    let cancelled = false;

    async function renderChart() {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: MERMAID_THEME,
          securityLevel: 'loose',
        });
        const result = await mermaid.render(`mermaid-${blockId}`, code);
        if (!cancelled) {
          setSvg(result.svg);
          setError('');
        }
      } catch (renderError) {
        if (!cancelled) {
          setSvg('');
          setError(renderError instanceof Error ? renderError.message : String(renderError));
        }
      }
    }

    void renderChart();

    return () => {
      cancelled = true;
    };
  }, [blockId, code]);

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Mermaid 渲染失败: {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
        Mermaid 渲染中...
      </div>
    );
  }

  return <div className="md-mermaid-wrap my-4 overflow-auto rounded-[1.2rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-4" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function MarkdownPreviewPage() {
  const { wrapLongLines } = usePreferencesStore();
  const [input, setInput] = useState(MARKDOWN_PREVIEW_EXAMPLE);
  const [activeView, setActiveView] = useState('preview');
  const [layoutMode, setLayoutMode] = useState<'split' | 'input' | 'preview'>('split');
  const [baseDir, setBaseDir] = useState('');
  const [resolvedAssetMap, setResolvedAssetMap] = useState<Record<string, string>>({});
  const [resourceWarnings, setResourceWarnings] = useState<string[]>([]);
  const [isResolvingAssets, setIsResolvingAssets] = useState(false);
  const [isExportingHtml, setIsExportingHtml] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const previewContentRef = useRef<HTMLDivElement | null>(null);
  const deferredInput = useDeferredValue(input);

  const stats = useMemo(() => collectStats(input), [input]);

  useEffect(() => {
    let cancelled = false;

    async function prepareMarkdown() {
      try {
        setIsResolvingAssets(true);
        const result = await resolveMarkdownAssets(deferredInput, baseDir);
        if (!cancelled) {
          setResourceWarnings(result.warnings);
          setResolvedAssetMap(result.resolvedMap);
        }
      } finally {
        if (!cancelled) {
          setIsResolvingAssets(false);
        }
      }
    }

    void prepareMarkdown();

    return () => {
      cancelled = true;
    };
  }, [deferredInput, baseDir]);

  const handlePickBaseDir = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: '选择 Markdown 资源根目录',
    });

    if (typeof selected === 'string') {
      setBaseDir(selected);
    }
  };

  const saveExportBytes = async (outputPath: string, bytes: Uint8Array) => {
    const base64 = encodeBytesToBase64(bytes);
    await invoke('save_markdown_export', {
      outputPath,
      contentBase64: base64,
    });
  };

  const handleExportHtml = async () => {
    if (!previewContentRef.current) {
      return;
    }

    const outputPath = await save({
      title: '导出 HTML',
      defaultPath: 'markdown-preview.html',
      filters: [{ name: 'HTML', extensions: ['html'] }],
    });

    if (!outputPath) {
      return;
    }

    setIsExportingHtml(true);
    try {
      const html = buildExportHtml(previewContentRef.current.innerHTML);
      await saveExportBytes(outputPath, new TextEncoder().encode(html));
    } finally {
      setIsExportingHtml(false);
    }
  };

  const handleExportPdf = async () => {
    if (!previewContentRef.current) {
      return;
    }

    const outputPath = await save({
      title: '导出 PDF',
      defaultPath: 'markdown-preview.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });

    if (!outputPath) {
      return;
    }

    setIsExportingPdf(true);
    try {
      const imageDataUrl = await toPng(previewContentRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const imageProps = pdf.getImageProperties(imageDataUrl);
      const renderWidth = pageWidth - margin * 2;
      const renderHeight = (imageProps.height * renderWidth) / imageProps.width;
      let remainingHeight = renderHeight;
      let offsetY = margin;

      pdf.addImage(imageDataUrl, 'PNG', margin, offsetY, renderWidth, renderHeight, undefined, 'FAST');
      remainingHeight -= pageHeight - margin * 2;

      while (remainingHeight > 0) {
        pdf.addPage();
        offsetY = margin - (renderHeight - remainingHeight);
        pdf.addImage(imageDataUrl, 'PNG', margin, offsetY, renderWidth, renderHeight, undefined, 'FAST');
        remainingHeight -= pageHeight - margin * 2;
      }

      const pdfBytes = pdf.output('arraybuffer');
      await saveExportBytes(outputPath, new Uint8Array(pdfBytes));
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <PageSection className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Markdown 预览"
          description="支持脚注、Mermaid、网络图片和本地图片，并可导出 HTML / PDF。"
          backTo="/"
          actions={
            <>
              <Button variant="outline" onClick={() => void handleExportHtml()} disabled={isExportingHtml}>
                <FileCode2 className="h-4 w-4" />
                {isExportingHtml ? '导出中...' : '导出 HTML'}
              </Button>
              <Button onClick={() => void handleExportPdf()} disabled={isExportingPdf}>
                <Download className="h-4 w-4" />
                {isExportingPdf ? '导出中...' : '导出 PDF'}
              </Button>
            </>
          }
        />

        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">资源设置</CardTitle>
            <CardDescription>本地图片支持绝对路径；相对路径图片需要先指定资源根目录。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <Input
                value={baseDir}
                onChange={(event) => setBaseDir(event.target.value)}
                placeholder="可选：相对路径图片的资源根目录"
                className="font-mono"
              />
              <Button variant="outline" onClick={() => void handlePickBaseDir()}>
                <FolderTree className="h-4 w-4" />
                选择目录
              </Button>
              <Button variant="ghost" onClick={() => setBaseDir('')} disabled={!baseDir}>
                清空目录
              </Button>
            </div>
            {isResolvingAssets ? <div className="text-sm text-muted-foreground">正在解析图片资源...</div> : null}
            {resourceWarnings.length > 0 ? (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                <div className="font-medium">以下图片未成功解析：</div>
                <div className="mt-2 space-y-1">
                  {resourceWarnings.map((warning) => (
                    <div key={warning} className="break-all">
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className={cn('grid gap-6', layoutMode === 'split' ? 'xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]' : 'grid-cols-1')}>
          {layoutMode !== 'preview' ? (
          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">输入 Markdown</CardTitle>
                  <CardDescription>支持脚注、Mermaid、Markdown 图片和 HTML img 标签。</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setInput(MARKDOWN_PREVIEW_EXAMPLE)}>
                    示例
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setInput('')} disabled={!input}>
                    清空
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setLayoutMode(layoutMode === 'input' ? 'split' : 'input')}
                    className="gap-2"
                  >
                    {layoutMode === 'input' ? <PanelLeftOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
                    {layoutMode === 'input' ? '恢复双栏' : '只看输入'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="min-h-[36rem] w-full rounded-2xl border border-border bg-muted/30 p-4 font-mono text-sm shadow-inner outline-none transition focus:border-primary"
                placeholder="在这里输入 Markdown..."
                spellCheck={false}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="字符数" value={String(stats.characterCount)} />
                <StatCard label="行数" value={String(stats.lineCount)} />
                <StatCard label="标题数" value={String(stats.headingCount)} />
              </div>
            </CardContent>
          </Card>
          ) : null}

          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">预览结果</CardTitle>
                  <CardDescription>导出使用当前预览内容，Mermaid、本地图片和脚注会一并保留。</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setLayoutMode(layoutMode === 'preview' ? 'split' : 'preview')}
                    className="gap-2"
                  >
                    {layoutMode === 'preview' ? <PanelRightOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                    {layoutMode === 'preview' ? '恢复双栏' : '只看渲染'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={activeView} onValueChange={setActiveView}>
                <TabsList>
                  <TabsTrigger value="preview">预览</TabsTrigger>
                  <TabsTrigger value="source">源码</TabsTrigger>
                </TabsList>
                <TabsContent value="preview">
                  <div className="max-h-[36rem] overflow-auto rounded-2xl border border-border bg-background p-6">
                    {input.trim() ? (
                      <div ref={previewContentRef} className="md-export md-preview-root space-y-4 text-sm leading-7 text-foreground">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            h1: ({ className, ...props }) => <h1 className={cn('md-h1 mt-2 border-b border-border pb-3 text-3xl font-semibold tracking-tight', className)} {...props} />,
                            h2: ({ className, ...props }) => <h2 className={cn('md-h2 mt-8 border-b border-border/70 pb-2 text-2xl font-semibold tracking-tight', className)} {...props} />,
                            h3: ({ className, ...props }) => <h3 className={cn('md-h3 mt-6 text-xl font-semibold tracking-tight', className)} {...props} />,
                            p: ({ className, node, children, ...props }) => {
                              const hasImageChild = node?.children?.some(
                                (child) => child.type === 'element' && child.tagName === 'img'
                              ) ?? false;

                              if (hasImageChild) {
                                return (
                                  <div className={cn('md-p space-y-3 text-sm leading-7 text-foreground', className)} {...props}>
                                    {children}
                                  </div>
                                );
                              }

                              return (
                                <p className={cn('md-p text-sm leading-7 text-foreground', className)} {...props}>
                                  {children}
                                </p>
                              );
                            },
                            a: ({ className, ...props }) => (
                              <a
                                className={cn('md-link break-all text-sky-600 underline underline-offset-4 hover:text-sky-500', className)}
                                target="_blank"
                                rel="noreferrer"
                                {...props}
                              />
                            ),
                            blockquote: ({ className, ...props }) => (
                              <blockquote className={cn('md-blockquote rounded-r-xl border-l-4 border-amber-400 bg-amber-50/70 px-4 py-3 text-muted-foreground dark:bg-amber-500/10', className)} {...props} />
                            ),
                            ul: ({ className, ...props }) => <ul className={cn('md-ul ml-6 list-disc space-y-2', className)} {...props} />,
                            ol: ({ className, ...props }) => <ol className={cn('md-ol ml-6 list-decimal space-y-2', className)} {...props} />,
                            li: ({ className, ...props }) => <li className={cn('md-li pl-1', className)} {...props} />,
                            hr: ({ className, ...props }) => <hr className={cn('md-hr my-6 border-border', className)} {...props} />,
                            table: ({ className, ...props }) => (
                              <div className="md-table-wrap overflow-x-auto rounded-xl border border-border">
                                <table className={cn('md-table w-full border-collapse text-left text-sm', className)} {...props} />
                              </div>
                            ),
                            th: ({ className, ...props }) => <th className={cn('md-th border-b border-border bg-muted px-4 py-2 font-medium', className)} {...props} />,
                            td: ({ className, ...props }) => <td className={cn('md-td border-b border-border/70 px-4 py-2 align-top', className)} {...props} />,
                            img: ({ className, alt, src, ...props }) => {
                              const rawSrc = typeof src === 'string' ? src.trim() : '';
                              const normalizedSrc = rawSrc && !isRemoteAssetPath(rawSrc)
                                ? resolvedAssetMap[normalizeMarkdownDestination(rawSrc)] || rawSrc
                                : rawSrc;
                              const isMissingLocalAsset = !!rawSrc && !isRemoteAssetPath(rawSrc) && !resolvedAssetMap[normalizeMarkdownDestination(rawSrc)];

                              if (!normalizedSrc || isMissingLocalAsset) {
                                return (
                                  <span className="inline-flex rounded-xl border border-dashed border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                                    {rawSrc ? `本地图片未成功解析：${rawSrc}` : '图片地址为空，已跳过渲染。'}
                                  </span>
                                );
                              }

                              return (
                                <img
                                  className={cn('md-img my-4 max-w-full rounded-[1.2rem] border border-border/60 shadow-sm', className)}
                                  alt={alt ?? 'Markdown 图片'}
                                  loading="eager"
                                  src={normalizedSrc}
                                  {...props}
                                />
                              );
                            },
                            section: ({ className, ...props }) => {
                              const currentClass = `${className ?? ''}`;
                              return (
                                <section
                                  className={cn(currentClass.includes('footnotes') ? 'md-footnotes mt-10 border-t border-border pt-4' : '', className)}
                                  {...props}
                                />
                              );
                            },
                            sup: ({ className, ...props }) => <sup className={cn('md-footnote-ref text-sky-600', className)} {...props} />,
                            code(props) {
                              const { className, children, ...rest } = props;
                              const match = /language-(\w+)/.exec(className ?? '');
                              const code = String(children).replace(/\n$/, '');
                              if (match?.[1] === 'mermaid') {
                                return <MermaidBlock code={code} />;
                              }
                              if (match) {
                                return (
                                  <CodeHighlighter
                                    code={code}
                                    language={match[1]}
                                    className="my-4"
                                    maxHeight="20rem"
                                    showLineNumbers={false}
                                    wrapLongLines={wrapLongLines}
                                  />
                                );
                              }
                              return (
                                <code className="md-inline-code rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-rose-600 dark:text-rose-300" {...rest}>
                                  {children}
                                </code>
                              );
                            },
                            pre: ({ children }) => <>{children}</>,
                          }}
                        >
                          {input}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex min-h-[20rem] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                        输入 Markdown 后，这里会显示实时预览。
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="source">
                  <CodeHighlighter
                    code={input}
                    language="markdown"
                    className="w-full"
                    maxHeight="36rem"
                    showLineNumbers
                    wrapLongLines={wrapLongLines}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. 脚注使用 GFM 语法，例如 `[^note]` 和 `[^note]: 内容`。</p>
            <p>2. Mermaid 代码块使用 `mermaid` 语言标记，预览和导出都会保留图表。</p>
            <p>3. 相对路径图片需要先选择资源根目录；绝对路径图片会直接解析为内嵌 data URL。</p>
            <p>4. HTML 导出会保留当前预览样式；PDF 导出基于当前预览生成长图分页。</p>
          </CardContent>
        </Card>
      </div>
    </PageSection>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-border/60 bg-background/70 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 break-all text-sm font-semibold">{value}</div>
    </div>
  );
}
