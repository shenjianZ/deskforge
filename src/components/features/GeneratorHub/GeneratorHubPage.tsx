import { useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Link } from "react-router-dom";
import { Check, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import {
  GENERATOR_MODULES,
  type ApiKeyGenerateOptions,
  type GeneratorItemsResult,
  type GeneratorModuleId,
  type HashAlgorithm,
  type HashGenerateResult,
  type JwtDecodeResult,
  type JwtGenerateResult,
  type NanoIdGenerateOptions,
  type PasswordGenerateOptions,
  type RandomValueGenerateOptions,
  type UuidGenerateOptions,
} from "@/types/generator";

const HASH_ALGORITHMS: Array<{ value: HashAlgorithm; label: string }> = [
  { value: "md5", label: "MD5" },
  { value: "sha1", label: "SHA-1" },
  { value: "sha256", label: "SHA-256" },
  { value: "sha512", label: "SHA-512" },
];

function formatDateTime(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

export function GeneratorHubPage() {
  const [activeTab, setActiveTab] = useState<GeneratorModuleId>("uuid");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [timestampVersion, setTimestampVersion] = useState(0);

  const [uuidOptions, setUuidOptions] = useState<UuidGenerateOptions>({ count: 5, uppercase: false, removeHyphens: false });
  const [uuidResult, setUuidResult] = useState<GeneratorItemsResult | null>(null);

  const [nanoIdOptions, setNanoIdOptions] = useState<NanoIdGenerateOptions>({ length: 21, count: 5, alphabet: null });
  const [nanoIdResult, setNanoIdResult] = useState<GeneratorItemsResult | null>(null);

  const [randomOptions, setRandomOptions] = useState<RandomValueGenerateOptions>({
    mode: "integer",
    count: 10,
    min: 0,
    max: 100,
    decimalPlaces: 2,
    length: 16,
    charset: null,
  });
  const [randomResult, setRandomResult] = useState<GeneratorItemsResult | null>(null);

  const [passwordOptions, setPasswordOptions] = useState<PasswordGenerateOptions>({
    length: 16,
    count: 6,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeSimilar: false,
  });
  const [passwordResult, setPasswordResult] = useState<GeneratorItemsResult | null>(null);

  const [apiKeyOptions, setApiKeyOptions] = useState<ApiKeyGenerateOptions>({ prefix: "sk_test", length: 24, count: 5, separator: "_" });
  const [apiKeyResult, setApiKeyResult] = useState<GeneratorItemsResult | null>(null);

  const [hashInput, setHashInput] = useState("DeskForge");
  const [hashAlgorithm, setHashAlgorithm] = useState<HashAlgorithm>("sha256");
  const [hashResult, setHashResult] = useState<HashGenerateResult | null>(null);

  const [jwtPayload, setJwtPayload] = useState('{\n  "sub": "user_123",\n  "role": "admin",\n  "iat": 1710912000\n}');
  const [jwtHeader, setJwtHeader] = useState("");
  const [jwtSecret, setJwtSecret] = useState("deskforge-dev-secret");
  const [jwtToken, setJwtToken] = useState("");
  const [jwtGenerateResult, setJwtGenerateResult] = useState<JwtGenerateResult | null>(null);
  const [jwtDecodeResult, setJwtDecodeResult] = useState<JwtDecodeResult | null>(null);

  const timestampSnapshot = useMemo(() => {
    const now = new Date();
    const milliseconds = Date.now();
    const seconds = Math.floor(milliseconds / 1000);
    return {
      seconds,
      milliseconds,
      iso: now.toISOString(),
      local: formatDateTime(now),
    };
  }, [timestampVersion]);

  const copyText = async (key: string, text: string) => {
    if (!text) {
      return;
    }
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1800);
  };

  const runAction = async (action: () => Promise<void>) => {
    setError("");
    try {
      await action();
    } catch (invokeError) {
      setError(invokeError instanceof Error ? invokeError.message : String(invokeError));
    }
  };

  return (
    <PageSection className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader title="生成器中心" description="把高频开发生成器收进同一工作区，一期覆盖 ID、密码、Hash、JWT 和时间戳。" backTo="/" />

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as GeneratorModuleId)} className="space-y-6">
          <Card className="rounded-[1.5rem] border-border/60 bg-background/80">
            <CardHeader>
              <CardTitle className="text-xl">开发刚需包</CardTitle>
              <CardDescription>统一入口、纯本地生成、离线可用。</CardDescription>
            </CardHeader>
            <CardContent>
              <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-2xl bg-muted/40 p-2">
                {GENERATOR_MODULES.map((module) => (
                  <TabsTrigger key={module.id} value={module.id} className="rounded-xl px-4 py-2">
                    {module.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="mt-4 text-sm text-muted-foreground">
                {GENERATOR_MODULES.find((module) => module.id === activeTab)?.description}
              </div>
            </CardContent>
          </Card>

          {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

          <TabsContent value="uuid">
            <GeneratorLayout
              title="UUID / GUID"
              description="批量生成标准 UUID，可选去掉连字符和转换大写。"
              meta={uuidResult?.meta ?? []}
              output={uuidResult?.text ?? ""}
              onCopy={() => void copyText("uuid", uuidResult?.text ?? "")}
              copied={copiedKey === "uuid"}
              onRefresh={() => void runAction(async () => setUuidResult(await invoke<GeneratorItemsResult>("generate_uuid", { options: uuidOptions })))}
            >
              <NumberField label="批量数量" value={uuidOptions.count} min={1} max={100} onChange={(value) => setUuidOptions((prev) => ({ ...prev, count: value }))} />
              <ToggleRow label="大写输出" checked={uuidOptions.uppercase} onChange={(checked) => setUuidOptions((prev) => ({ ...prev, uppercase: checked }))} />
              <ToggleRow label="移除连字符" checked={uuidOptions.removeHyphens} onChange={(checked) => setUuidOptions((prev) => ({ ...prev, removeHyphens: checked }))} />
            </GeneratorLayout>
          </TabsContent>

          <TabsContent value="nanoid">
            <GeneratorLayout
              title="NanoID"
              description="适合短链接、前端临时主键和测试数据。"
              meta={nanoIdResult?.meta ?? []}
              output={nanoIdResult?.text ?? ""}
              onCopy={() => void copyText("nanoid", nanoIdResult?.text ?? "")}
              copied={copiedKey === "nanoid"}
              onRefresh={() => void runAction(async () => setNanoIdResult(await invoke<GeneratorItemsResult>("generate_nanoid", { options: nanoIdOptions })))}
            >
              <NumberField label="长度" value={nanoIdOptions.length} min={8} max={128} onChange={(value) => setNanoIdOptions((prev) => ({ ...prev, length: value }))} />
              <NumberField label="批量数量" value={nanoIdOptions.count} min={1} max={100} onChange={(value) => setNanoIdOptions((prev) => ({ ...prev, count: value }))} />
              <TextField label="自定义字符集" value={nanoIdOptions.alphabet ?? ""} placeholder="留空则使用默认字符集" onChange={(value) => setNanoIdOptions((prev) => ({ ...prev, alphabet: value || null }))} />
            </GeneratorLayout>
          </TabsContent>

          <TabsContent value="random">
            <GeneratorLayout
              title="随机值"
              description="支持随机整数、浮点数和随机字符串。"
              meta={randomResult?.meta ?? []}
              output={randomResult?.text ?? ""}
              onCopy={() => void copyText("random", randomResult?.text ?? "")}
              copied={copiedKey === "random"}
              onRefresh={() => void runAction(async () => setRandomResult(await invoke<GeneratorItemsResult>("generate_random_value", { options: randomOptions })))}
            >
              <OptionButtons
                label="模式"
                options={[
                  { value: "integer", label: "整数" },
                  { value: "float", label: "浮点数" },
                  { value: "string", label: "字符串" },
                ]}
                value={randomOptions.mode}
                onChange={(value) => setRandomOptions((prev) => ({ ...prev, mode: value as RandomValueGenerateOptions["mode"] }))}
              />
              <NumberField label="批量数量" value={randomOptions.count} min={1} max={100} onChange={(value) => setRandomOptions((prev) => ({ ...prev, count: value }))} />
              {randomOptions.mode !== "string" ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <NumberField label="最小值" value={randomOptions.min} onChange={(value) => setRandomOptions((prev) => ({ ...prev, min: value }))} />
                  <NumberField label="最大值" value={randomOptions.max} onChange={(value) => setRandomOptions((prev) => ({ ...prev, max: value }))} />
                  {randomOptions.mode === "float" ? (
                    <NumberField label="小数位" value={randomOptions.decimalPlaces} min={0} max={8} onChange={(value) => setRandomOptions((prev) => ({ ...prev, decimalPlaces: value }))} />
                  ) : <div />}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField label="字符串长度" value={randomOptions.length} min={1} max={256} onChange={(value) => setRandomOptions((prev) => ({ ...prev, length: value }))} />
                  <TextField label="字符集" value={randomOptions.charset ?? ""} placeholder="留空使用默认字符集" onChange={(value) => setRandomOptions((prev) => ({ ...prev, charset: value || null }))} />
                </div>
              )}
            </GeneratorLayout>
          </TabsContent>

          <TabsContent value="password">
            <GeneratorLayout
              title="密码生成器"
              description="按字符规则生成测试密码，适合注册和权限场景调试。"
              meta={passwordResult?.meta ?? []}
              output={passwordResult?.text ?? ""}
              onCopy={() => void copyText("password", passwordResult?.text ?? "")}
              copied={copiedKey === "password"}
              onRefresh={() => void runAction(async () => setPasswordResult(await invoke<GeneratorItemsResult>("generate_password", { options: passwordOptions })))}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField label="密码长度" value={passwordOptions.length} min={4} max={256} onChange={(value) => setPasswordOptions((prev) => ({ ...prev, length: value }))} />
                <NumberField label="批量数量" value={passwordOptions.count} min={1} max={100} onChange={(value) => setPasswordOptions((prev) => ({ ...prev, count: value }))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <ToggleRow label="大写字母" checked={passwordOptions.includeUppercase} onChange={(checked) => setPasswordOptions((prev) => ({ ...prev, includeUppercase: checked }))} />
                <ToggleRow label="小写字母" checked={passwordOptions.includeLowercase} onChange={(checked) => setPasswordOptions((prev) => ({ ...prev, includeLowercase: checked }))} />
                <ToggleRow label="数字" checked={passwordOptions.includeNumbers} onChange={(checked) => setPasswordOptions((prev) => ({ ...prev, includeNumbers: checked }))} />
                <ToggleRow label="符号" checked={passwordOptions.includeSymbols} onChange={(checked) => setPasswordOptions((prev) => ({ ...prev, includeSymbols: checked }))} />
                <ToggleRow label="排除易混字符" checked={passwordOptions.excludeSimilar} onChange={(checked) => setPasswordOptions((prev) => ({ ...prev, excludeSimilar: checked }))} />
              </div>
            </GeneratorLayout>
          </TabsContent>

          <TabsContent value="apiKey">
            <GeneratorLayout
              title="API Key / Token"
              description="生成带前缀的随机 key，适合 mock 配置、接口文档和联调。"
              meta={apiKeyResult?.meta ?? []}
              output={apiKeyResult?.text ?? ""}
              onCopy={() => void copyText("apiKey", apiKeyResult?.text ?? "")}
              copied={copiedKey === "apiKey"}
              onRefresh={() => void runAction(async () => setApiKeyResult(await invoke<GeneratorItemsResult>("generate_api_key", { options: apiKeyOptions })))}
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <TextField label="前缀" value={apiKeyOptions.prefix} onChange={(value) => setApiKeyOptions((prev) => ({ ...prev, prefix: value }))} />
                <NumberField label="随机段长度" value={apiKeyOptions.length} min={8} max={128} onChange={(value) => setApiKeyOptions((prev) => ({ ...prev, length: value }))} />
                <NumberField label="批量数量" value={apiKeyOptions.count} min={1} max={100} onChange={(value) => setApiKeyOptions((prev) => ({ ...prev, count: value }))} />
                <TextField label="分隔符" value={apiKeyOptions.separator} onChange={(value) => setApiKeyOptions((prev) => ({ ...prev, separator: value }))} />
              </div>
            </GeneratorLayout>
          </TabsContent>

          <TabsContent value="hash">
            <GeneratorLayout
              title="Hash"
              description="计算输入内容的 MD5 / SHA 摘要，适合快速校验和测试。"
              meta={hashResult?.meta ?? []}
              output={hashResult?.value ?? ""}
              onCopy={() => void copyText("hash", hashResult?.value ?? "")}
              copied={copiedKey === "hash"}
              onRefresh={() => void runAction(async () => setHashResult(await invoke<HashGenerateResult>("generate_hash", { options: { input: hashInput, algorithm: hashAlgorithm } })))}
            >
              <OptionButtons label="算法" options={HASH_ALGORITHMS} value={hashAlgorithm} onChange={(value) => setHashAlgorithm(value as HashAlgorithm)} />
              <div className="space-y-2">
                <Label>输入内容</Label>
                <textarea value={hashInput} onChange={(event) => setHashInput(event.target.value)} className="min-h-40 w-full rounded-2xl border border-border bg-muted/30 p-4 font-mono text-sm outline-none" spellCheck={false} />
              </div>
            </GeneratorLayout>
          </TabsContent>

          <TabsContent value="jwt">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <Card className="rounded-[1.5rem] border-border/60 bg-background/80">
                <CardHeader>
                  <CardTitle className="text-xl">JWT Mock</CardTitle>
                  <CardDescription>本地生成 HS256 签名 JWT，也支持解析现有 token。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <TextField label="Secret" value={jwtSecret} onChange={setJwtSecret} />
                  <div className="space-y-2">
                    <Label>Payload JSON</Label>
                    <textarea value={jwtPayload} onChange={(event) => setJwtPayload(event.target.value)} className="min-h-44 w-full rounded-2xl border border-border bg-muted/30 p-4 font-mono text-sm outline-none" spellCheck={false} />
                  </div>
                  <div className="space-y-2">
                    <Label>Header JSON（可选）</Label>
                    <textarea value={jwtHeader} onChange={(event) => setJwtHeader(event.target.value)} className="min-h-28 w-full rounded-2xl border border-border bg-muted/30 p-4 font-mono text-sm outline-none" placeholder='留空默认 {"alg":"HS256","typ":"JWT"}' spellCheck={false} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void runAction(async () => {
                      const result = await invoke<JwtGenerateResult>("generate_jwt_mock", { options: { payloadJson: jwtPayload, secret: jwtSecret, headerJson: jwtHeader } });
                      setJwtGenerateResult(result);
                      setJwtToken(result.token);
                    })}>生成 JWT</Button>
                    <Button variant="outline" onClick={() => void runAction(async () => setJwtDecodeResult(await invoke<JwtDecodeResult>("decode_jwt_mock", { options: { token: jwtToken } })))}>解析 JWT</Button>
                  </div>
                  <div className="space-y-2">
                    <Label>JWT Token</Label>
                    <textarea value={jwtToken} onChange={(event) => setJwtToken(event.target.value)} className="min-h-32 w-full rounded-2xl border border-border bg-muted/30 p-4 font-mono text-sm outline-none" spellCheck={false} />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[1.5rem] border-border/60 bg-background/80">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl">结果</CardTitle>
                      <CardDescription>生成后会展示 token、header、payload 和签名信息。</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => void copyText("jwt", jwtToken)} disabled={!jwtToken}>
                      {copiedKey === "jwt" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copiedKey === "jwt" ? "已复制" : "复制 JWT"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(jwtGenerateResult?.meta ?? jwtDecodeResult?.meta ?? []).length > 0 ? (
                    <div className="flex flex-wrap gap-2">{(jwtGenerateResult?.meta ?? jwtDecodeResult?.meta ?? []).map((item) => <MetaChip key={item} text={item} />)}</div>
                  ) : null}
                  <ResultBlock label="Header" value={jwtDecodeResult?.headerPretty ?? jwtGenerateResult?.headerPretty ?? ""} />
                  <ResultBlock label="Payload" value={jwtDecodeResult?.payloadPretty ?? jwtGenerateResult?.payloadPretty ?? ""} />
                  <ResultBlock label="Signature" value={jwtDecodeResult?.signature ?? ""} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="timestamp">
            <Card className="rounded-[1.5rem] border-border/60 bg-background/80">
              <CardHeader>
                <CardTitle className="text-xl">时间戳快捷生成</CardTitle>
                <CardDescription>快速拿当前时间的秒级、毫秒级、本地格式和 ISO 格式。</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TimestampCard label="秒级时间戳" value={String(timestampSnapshot.seconds)} onCopy={() => void copyText("ts-seconds", String(timestampSnapshot.seconds))} copied={copiedKey === "ts-seconds"} />
                    <TimestampCard label="毫秒时间戳" value={String(timestampSnapshot.milliseconds)} onCopy={() => void copyText("ts-ms", String(timestampSnapshot.milliseconds))} copied={copiedKey === "ts-ms"} />
                    <TimestampCard label="本地时间" value={timestampSnapshot.local} onCopy={() => void copyText("ts-local", timestampSnapshot.local)} copied={copiedKey === "ts-local"} />
                    <TimestampCard label="ISO 8601" value={timestampSnapshot.iso} onCopy={() => void copyText("ts-iso", timestampSnapshot.iso)} copied={copiedKey === "ts-iso"} />
                  </div>
                  <Button onClick={() => setTimestampVersion((value) => value + 1)} variant="outline">
                    <RefreshCw className="h-4 w-4" />
                    刷新当前时间
                  </Button>
                </div>
                <Card className="rounded-[1.25rem] border-border/60 bg-muted/20 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-lg">深入转换</CardTitle>
                    <CardDescription>复杂时间解析、格式化和反向转换继续使用现有工具页。</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild>
                      <Link to="/feature/timestamp-converter">打开时间戳转换</Link>
                    </Button>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageSection>
  );
}

function GeneratorLayout({
  title,
  description,
  meta,
  output,
  onCopy,
  copied,
  onRefresh,
  children,
}: {
  title: string;
  description: string;
  meta: string[];
  output: string;
  onCopy: () => void;
  copied: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <Card className="rounded-[1.5rem] border-border/60 bg-background/80">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {children}
          <Button onClick={onRefresh}>生成结果</Button>
        </CardContent>
      </Card>

      <Card className="rounded-[1.5rem] border-border/60 bg-background/80">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">输出结果</CardTitle>
              <CardDescription>支持批量输出和一键复制。</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onCopy} disabled={!output}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "已复制" : "复制"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {meta.length > 0 ? <div className="flex flex-wrap gap-2">{meta.map((item) => <MetaChip key={item} text={item} />)}</div> : null}
          <textarea value={output} readOnly className="min-h-[28rem] w-full rounded-2xl border border-border bg-muted/30 p-4 font-mono text-sm outline-none" />
        </CardContent>
      </Card>
    </div>
  );
}

function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" value={value} min={min} max={max} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <Button type="button" size="sm" variant={checked ? "default" : "outline"} onClick={() => onChange(!checked)}>
        {checked ? "开启" : "关闭"}
      </Button>
    </div>
  );
}

function OptionButtons({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button key={option.value} type="button" size="sm" variant={value === option.value ? "default" : "outline"} onClick={() => onChange(option.value)}>
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function MetaChip({ text }: { text: string }) {
  return <div className="rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs text-muted-foreground">{text}</div>;
}

function ResultBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <textarea value={value} readOnly className="min-h-28 w-full rounded-2xl border border-border bg-muted/30 p-4 font-mono text-sm outline-none" />
    </div>
  );
}

function TimestampCard({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="rounded-[1.2rem] border border-border/60 bg-background/70 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 break-all font-mono text-sm font-semibold">{value}</div>
      <Button variant="outline" size="sm" className="mt-3" onClick={onCopy}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "已复制" : "复制"}
      </Button>
    </div>
  );
}


