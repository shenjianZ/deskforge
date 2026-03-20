import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageSection } from '@/components/layout/PageSection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePreferencesStore } from '@/stores/preferencesStore';
import {
  DEFAULT_REGEX_FLAGS,
  REGEX_TEST_EXAMPLE,
  type RegexFlags,
  type RegexGroupItem,
  type RegexMatchItem,
  type RegexReplaceResult,
  type RegexTestResult,
} from '@/types/regex';
import { CodeHighlighter } from '@/components/ui/code-highlighter';

function getFlags(flags: RegexFlags) {
  return Object.entries(flags)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key)
    .join('');
}

function buildMatches(pattern: string, flags: string, input: string): RegexMatchItem[] {
  const normalizedFlags = flags.includes('g') ? flags : `${flags}g`;
  const regex = new RegExp(pattern, normalizedFlags);
  const matches: RegexMatchItem[] = [];
  let matchIndex = 0;

  while (true) {
    const match = regex.exec(input);
    if (!match) {
      break;
    }

    const groups: RegexGroupItem[] = match.slice(1).map((value, index) => ({
      index: index + 1,
      value: value ?? '',
    }));

    matches.push({
      index: matchIndex,
      match: match[0],
      start: match.index,
      end: match.index + match[0].length,
      groups,
    });
    matchIndex += 1;

    if (match[0] === '') {
      regex.lastIndex += 1;
    }
  }

  return matches;
}

function testRegex(pattern: string, flags: string, input: string): RegexTestResult {
  try {
    if (!pattern) {
      return { isValid: true, flags, matches: [] };
    }

    const baseRegex = new RegExp(pattern, flags);
    const matches = flags.includes('g')
      ? buildMatches(pattern, flags, input)
      : (() => {
          const first = baseRegex.exec(input);
          if (!first) {
            return [];
          }
          return [
            {
              index: 0,
              match: first[0],
              start: first.index,
              end: first.index + first[0].length,
              groups: first.slice(1).map((value, index) => ({
                index: index + 1,
                value: value ?? '',
              })),
            },
          ];
        })();

    return { isValid: true, flags, matches };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      flags,
      matches: [],
    };
  }
}

function replaceRegex(pattern: string, flags: string, input: string, replacement: string): RegexReplaceResult {
  if (!pattern) {
    return { output: input };
  }

  const regex = new RegExp(pattern, flags);
  return { output: input.replace(regex, replacement) };
}

export function RegexTesterPage() {
  const { wrapLongLines } = usePreferencesStore();
  const [pattern, setPattern] = useState(REGEX_TEST_EXAMPLE.pattern);
  const [replacement, setReplacement] = useState(REGEX_TEST_EXAMPLE.replacement);
  const [input, setInput] = useState(REGEX_TEST_EXAMPLE.input);
  const [flags, setFlags] = useState<RegexFlags>(DEFAULT_REGEX_FLAGS);

  const flagString = useMemo(() => getFlags(flags), [flags]);
  const result = useMemo(() => testRegex(pattern, flagString, input), [pattern, flagString, input]);
  const replaceResult = useMemo(() => {
    if (!result.isValid) {
      return { output: '' };
    }

    try {
      return replaceRegex(pattern, flagString, input, replacement);
    } catch {
      return { output: '' };
    }
  }, [result.isValid, pattern, flagString, input, replacement]);

  return (
    <PageSection className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader title="正则测试" description="基于 JavaScript RegExp 语义，支持表达式测试、捕获组查看和替换结果预览。" backTo="/" />

        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">配置</CardTitle>
            <CardDescription>表达式只输入 pattern 本体，不需要手动写前后的斜杠。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-2">
                <Label htmlFor="regex-pattern">表达式</Label>
                <Input id="regex-pattern" value={pattern} onChange={(event) => setPattern(event.target.value)} placeholder="例如: (\\w+)-(\\d+)" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regex-replacement">替换模板</Label>
                <Input id="regex-replacement" value={replacement} onChange={(event) => setReplacement(event.target.value)} placeholder="例如: $1" className="font-mono" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Flags</Label>
              <div className="flex flex-wrap gap-2">
                {(['g', 'i', 'm', 's', 'u', 'y'] as const).map((flag) => (
                  <Button
                    key={flag}
                    size="sm"
                    type="button"
                    variant={flags[flag] ? 'default' : 'outline'}
                    onClick={() => setFlags((current) => ({ ...current, [flag]: !current[flag] }))}
                  >
                    {flag}
                  </Button>
                ))}
                <div className="flex items-center rounded-full border border-border/70 bg-muted/30 px-3 text-sm text-muted-foreground">
                  当前: /{pattern || 'pattern'}/{flagString}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPattern(REGEX_TEST_EXAMPLE.pattern);
                  setReplacement(REGEX_TEST_EXAMPLE.replacement);
                  setInput(REGEX_TEST_EXAMPLE.input);
                  setFlags(DEFAULT_REGEX_FLAGS);
                }}
              >
                示例
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setPattern('');
                  setReplacement('');
                  setInput('');
                  setFlags(DEFAULT_REGEX_FLAGS);
                }}
              >
                清空
              </Button>
            </div>

            {!result.isValid && result.errorMessage ? (
              <div className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {result.errorMessage}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">测试文本</CardTitle>
              <CardDescription>支持多行文本，适合验证全局、多行和分组匹配效果。</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="min-h-[34rem] w-full rounded-2xl border border-border bg-muted/30 p-4 font-mono text-sm shadow-inner outline-none transition focus:border-primary"
                placeholder="在这里输入待测试的文本..."
                spellCheck={false}
              />
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">结果</CardTitle>
              <CardDescription>显示匹配列表、捕获组明细和替换结果。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="匹配数" value={String(result.matches.length)} />
                <StatCard label="Flags" value={flagString || '-'} />
                <StatCard label="输入长度" value={String(input.length)} />
              </div>

              <Tabs defaultValue="matches">
                <TabsList>
                  <TabsTrigger value="matches">匹配结果</TabsTrigger>
                  <TabsTrigger value="groups">分组明细</TabsTrigger>
                  <TabsTrigger value="replace">替换结果</TabsTrigger>
                </TabsList>

                <TabsContent value="matches">
                  <div className="max-h-[28rem] space-y-3 overflow-auto">
                    {!result.isValid ? (
                      <EmptyState text="当前表达式无效，无法计算匹配结果。" />
                    ) : result.matches.length === 0 ? (
                      <EmptyState text="未匹配到结果。" />
                    ) : (
                      result.matches.map((item) => (
                        <div key={`${item.index}-${item.start}`} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                          <div className="text-sm font-semibold">匹配 #{item.index + 1}</div>
                          <div className="mt-2 rounded-xl bg-muted/40 px-3 py-2 font-mono text-sm break-all">{item.match || '(空字符串)'}</div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            位置: {item.start} - {item.end}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="groups">
                  <div className="max-h-[28rem] space-y-3 overflow-auto">
                    {!result.isValid ? (
                      <EmptyState text="当前表达式无效，无法显示捕获组。" />
                    ) : result.matches.length === 0 ? (
                      <EmptyState text="没有匹配结果，自然也没有捕获组。" />
                    ) : (
                      result.matches.map((item) => (
                        <div key={`${item.index}-groups`} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                          <div className="text-sm font-semibold">匹配 #{item.index + 1}</div>
                          <div className="mt-2 text-xs text-muted-foreground">完整匹配</div>
                          <div className="mt-1 rounded-xl bg-muted/40 px-3 py-2 font-mono text-sm break-all">{item.match || '(空字符串)'}</div>
                          {item.groups.length > 0 ? (
                            <div className="mt-3 space-y-2">
                              {item.groups.map((group) => (
                                <div key={`${item.index}-${group.index}`} className="rounded-xl border border-border/60 px-3 py-2">
                                  <div className="text-xs text-muted-foreground">捕获组 ${group.index}</div>
                                  <div className="mt-1 font-mono text-sm break-all">{group.value || '(空字符串)'}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-3 text-sm text-muted-foreground">当前表达式没有捕获组。</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="replace">
                  <CodeHighlighter
                    code={result.isValid ? replaceResult.output : ''}
                    language="text"
                    className="w-full"
                    maxHeight="28rem"
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
            <p>1. 当前按 JavaScript RegExp 语义执行，适合前端、Node.js 和多数浏览器场景。</p>
            <p>2. 未开启 g 时只显示首个匹配；开启 g 时会返回全部匹配。</p>
            <p>3. 替换结果支持标准的 $1、$2 占位写法。</p>
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
      <div className="mt-1 text-sm font-semibold break-all">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[14rem] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-sm text-muted-foreground">
      {text}
    </div>
  );
}
