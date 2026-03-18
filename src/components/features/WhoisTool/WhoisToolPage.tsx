import { useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeHighlighter } from '@/components/ui/code-highlighter';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageSection } from '@/components/layout/PageSection';
import type { WhoisLookupResult } from '@/types/whois';
import { RefreshCw, ShieldCheck, Globe2 } from 'lucide-react';

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid gap-2 rounded-[1rem] border border-border/60 bg-background/70 px-4 py-3 md:grid-cols-[120px_minmax(0,1fr)]">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="break-all text-sm font-medium">{value || '-'}</div>
    </div>
  );
}

export function WhoisToolPage() {
  const [domain, setDomain] = useState('example.com');
  const [result, setResult] = useState<WhoisLookupResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const lookup = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await invoke<WhoisLookupResult>('lookup_whois', {
        config: { domain },
      });
      setResult(response);
    } finally {
      setIsLoading(false);
    }
  }, [domain]);

  return (
    <PageSection className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="WHOIS 查询"
          backTo="/"
          actions={
            <Button className="rounded-xl" onClick={() => void lookup()} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? '查询中...' : '查询'}
            </Button>
          }
        />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(14,165,233,0.16),rgba(59,130,246,0.14))] text-sky-600 dark:text-sky-300">
                  <Globe2 className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">查询参数</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">域名</div>
                <Input
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  placeholder="example.com 或 https://example.com"
                  className="h-11 rounded-xl border-border/60"
                />
                <div className="text-xs leading-5 text-muted-foreground">
                  支持直接粘贴 URL，系统会自动提取主机名后查询注册信息。
                </div>
                <div className="text-xs leading-5 text-muted-foreground">
                  如果输入的是子域名，例如 `gitea.example.com`，系统会自动回退到父级注册域名进行 WHOIS 查询。
                </div>
              </div>
              <div className="text-sm leading-6 text-muted-foreground">
                当前使用 RDAP 接口获取域名注册信息，适合查看注册商、域名状态、名称服务器和注册/到期时间。
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(34,197,94,0.18),rgba(16,185,129,0.14))] text-emerald-600 dark:text-emerald-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">结果概览</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Domain" value={result?.domain} />
              <InfoRow label="Registrar" value={result?.registrar} />
              <InfoRow label="Handle" value={result?.handle} />
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{result?.success ? 'Success' : 'Pending / Error'}</Badge>
                <Badge variant="outline">Statuses {result?.statuses.length ?? 0}</Badge>
                <Badge variant="outline">Nameservers {result?.nameservers.length ?? 0}</Badge>
              </div>
              {result?.error ? (
                <div className="rounded-[1rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {result.error}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">查询结果</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="summary">
              <TabsList className="flex w-full flex-wrap justify-start gap-2 rounded-2xl bg-muted/40 p-2">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="raw">Raw JSON</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-5 space-y-4">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-3">
                    <div className="text-sm font-medium">域名状态</div>
                    {result?.statuses.length ? (
                      <div className="flex flex-wrap gap-2">
                        {result.statuses.map((status) => (
                          <Badge key={status} variant="outline">{status}</Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">暂无状态信息。</div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium">名称服务器</div>
                    {result?.nameservers.length ? (
                      <div className="space-y-2">
                        {result.nameservers.map((item) => (
                          <div key={item} className="rounded-[1rem] border border-border/60 bg-background/70 px-4 py-3 font-mono text-sm">
                            {item}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">暂无名称服务器信息。</div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">关键事件</div>
                  {result?.events.length ? (
                    <div className="space-y-2">
                      {result.events.map((event) => (
                        <div key={`${event.eventAction}-${event.eventDate}`} className="grid gap-2 rounded-[1rem] border border-border/60 bg-background/70 px-4 py-3 md:grid-cols-[180px_minmax(0,1fr)]">
                          <div className="text-sm text-muted-foreground">{event.eventAction}</div>
                          <div className="break-all text-sm font-medium">{event.eventDate}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">暂无事件信息。</div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="raw" className="mt-5">
                <CodeHighlighter
                  code={result?.rawResponse || ''}
                  language="json"
                  className="w-full"
                  maxHeight="30rem"
                  showLineNumbers
                  wrapLongLines
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageSection>
  );
}
