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
import type { DnsLookupConfig, DnsLookupResult, DnsRecordType } from '@/types/dns';
import { Globe2, RefreshCw, Search } from 'lucide-react';

const RECORD_TYPES: DnsRecordType[] = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'];

function RecordRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid gap-2 rounded-[1rem] border border-border/60 bg-background/70 px-4 py-3 md:grid-cols-[120px_minmax(0,1fr)]">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="break-all font-mono text-sm">{value}</div>
    </div>
  );
}

export function DnsLookupToolPage() {
  const [config, setConfig] = useState<DnsLookupConfig>({
    domain: 'example.com',
    recordType: 'A',
  });
  const [result, setResult] = useState<DnsLookupResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const lookup = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await invoke<DnsLookupResult>('lookup_dns_records', { config });
      setResult(response);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  return (
    <PageSection className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="DNS 查询"
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
                  <Search className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">查询参数</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="text-sm font-medium">域名</div>
                <Input
                  value={config.domain}
                  onChange={(event) => setConfig((prev) => ({ ...prev, domain: event.target.value }))}
                  placeholder="example.com 或 https://example.com/path"
                  className="h-11 rounded-xl border-border/60"
                />
                <div className="text-xs leading-5 text-muted-foreground">
                  支持直接粘贴 URL，系统会自动提取主机名进行 DNS 查询。
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">记录类型</div>
                <div className="flex flex-wrap gap-2">
                  {RECORD_TYPES.map((recordType) => (
                    <Button
                      key={recordType}
                      size="sm"
                      variant={config.recordType === recordType ? 'default' : 'outline'}
                      onClick={() => setConfig((prev) => ({ ...prev, recordType }))}
                    >
                      {recordType}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="text-sm leading-6 text-muted-foreground">
                通过 DNS over HTTPS 查询常见记录类型。若输入完整 URL，会自动提取域名；结果页同时展示结构化记录和原始 JSON。
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(34,197,94,0.18),rgba(16,185,129,0.14))] text-emerald-600 dark:text-emerald-300">
                  <Globe2 className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">结果概览</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <RecordRow label="Domain" value={result?.domain || '-'} />
                <RecordRow label="Type" value={result?.recordType || '-'} />
                <RecordRow label="Status" value={result?.status ?? '-'} />
                <RecordRow label="Answers" value={result?.answers.length ?? 0} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{result?.success ? 'Success' : 'Pending / Error'}</Badge>
                <Badge variant="outline">{result?.authoritative ? 'Authoritative' : 'Non-authoritative'}</Badge>
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
            <Tabs defaultValue="records">
              <TabsList className="flex w-full flex-wrap justify-start gap-2 rounded-2xl bg-muted/40 p-2">
                <TabsTrigger value="records">Records</TabsTrigger>
                <TabsTrigger value="raw">Raw JSON</TabsTrigger>
              </TabsList>
              <TabsContent value="records" className="mt-5 space-y-3">
                {result?.answers.length ? (
                  result.answers.map((answer, index) => (
                    <div key={`${answer.name}-${answer.data}-${index}`} className="space-y-3 rounded-[1.4rem] border border-border/60 bg-background/70 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{answer.recordType}</Badge>
                        <Badge variant="outline">TTL {answer.ttl}</Badge>
                      </div>
                      <RecordRow label="Name" value={answer.name} />
                      <RecordRow label="Data" value={answer.data} />
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.4rem] border border-dashed border-border/70 bg-background/60 px-6 py-14 text-center text-sm text-muted-foreground">
                    {result ? '当前没有解析结果。' : '输入域名并查询后，这里显示解析记录。'}
                  </div>
                )}
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

        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">记录类型说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">A</span>：查询 IPv4 地址，适合确认域名当前指向哪台服务器。</p>
            <p><span className="font-medium text-foreground">AAAA</span>：查询 IPv6 地址，适合确认域名是否已启用 IPv6。</p>
            <p><span className="font-medium text-foreground">CNAME</span>：查询别名指向，适合判断域名是否转到另一个主机名。</p>
            <p><span className="font-medium text-foreground">MX</span>：查询邮件服务器，适合排查邮箱投递相关配置。</p>
            <p><span className="font-medium text-foreground">TXT</span>：查询文本记录，常用于 SPF、DKIM、域名验证等场景。</p>
            <p><span className="font-medium text-foreground">NS</span>：查询权威 DNS 服务器，表示这个域名由哪些名称服务器负责解析。</p>
          </CardContent>
        </Card>
      </div>
    </PageSection>
  );
}
