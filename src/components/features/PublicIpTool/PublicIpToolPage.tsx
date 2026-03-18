import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageSection } from '@/components/layout/PageSection';
import type { PublicIpInfo } from '@/types/public-ip';
import { Globe, RefreshCw, ShieldCheck, Waypoints } from 'lucide-react';

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1rem] border border-border/60 bg-background/70 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value || '-'}</span>
    </div>
  );
}

export function PublicIpToolPage() {
  const [data, setData] = useState<PublicIpInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPublicIpInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await invoke<PublicIpInfo>('get_public_ip_info');
      setData(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPublicIpInfo();
  }, [fetchPublicIpInfo]);

  return (
    <PageSection className="space-y-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          title="公网 IP 查询"
          backTo="/"
          actions={
            <Button className="rounded-xl" onClick={() => void fetchPublicIpInfo()} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? '查询中...' : '刷新'}
            </Button>
          }
        />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(14,165,233,0.16),rgba(59,130,246,0.14))] text-sky-600 dark:text-sky-300">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Public Network</div>
                  <CardTitle className="text-lg">公网出口</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.6rem] border border-border/60 bg-background/75 p-5">
                <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Current IP</div>
                <div className="mt-3 break-all font-mono text-3xl font-semibold tracking-tight">
                  {data?.currentIp || (isLoading ? 'Loading...' : '-')}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">{data?.country || 'Unknown Country'}</Badge>
                  <Badge variant="outline">{data?.region || 'Unknown Region'}</Badge>
                  <Badge variant="outline">{data?.city || 'Unknown City'}</Badge>
                </div>
              </div>

              {error ? (
                <div className="rounded-[1.2rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <InfoRow label="IPv4" value={data?.ipv4} />
                <InfoRow label="IPv6" value={data?.ipv6} />
                <InfoRow label="时区" value={data?.timezone} />
                <InfoRow label="ASN" value={data?.asn} />
                <InfoRow label="组织" value={data?.organization} />
                <InfoRow label="ISP" value={data?.isp} />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(34,197,94,0.18),rgba(16,185,129,0.14))] text-emerald-600 dark:text-emerald-300">
                    <Waypoints className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">用途</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>1. 确认当前出口 IP 是否与预期代理或网络环境一致。</p>
                <p>2. 同时对比 `api.ipify`、`api6.ipify` 和 `api64.ipify` 的返回，区分 IPv4、IPv6 和当前实际出口。</p>
                <p>3. 快速查看基础归属地、ASN 和 ISP 信息，便于网络排障。</p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(249,115,22,0.18),rgba(234,179,8,0.14))] text-orange-600 dark:text-orange-300">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">说明</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>当前使用公开接口查询公网 IP 与基础归属信息。</p>
                <p>如果你的网络环境屏蔽外部接口，这里会直接返回错误信息。</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </PageSection>
  );
}
