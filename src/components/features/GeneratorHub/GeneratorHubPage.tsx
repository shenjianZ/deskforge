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
  COUNTRY_PRESETS,
  GENERATOR_MODULES,
  type ApiKeyGenerateOptions,
  type CountryPreset,
  type GeneratorItemsResult,
  type GeneratorModuleId,
  type HashAlgorithm,
  type HashGenerateResult,
  type IdentityGenerateOptions,
  type JwtDecodeResult,
  type JwtGenerateResult,
  type NanoIdGenerateOptions,
  type PasswordGenerateOptions,
  type PaymentCardGenerateOptions,
  type RandomValueGenerateOptions,
  type UserDataGenerateOptions,
  type UserDataGenerateResult,
  type UserProfileGenerateOptions,
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
  const [group, setGroup] = useState<"dev" | "user">("dev");
  const [activeTab, setActiveTab] = useState<GeneratorModuleId>("uuid");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [timestampVersion, setTimestampVersion] = useState(0);
  const [country, setCountry] = useState<CountryPreset>("cn");
  const [count, setCount] = useState(5);
  const [jsonView, setJsonView] = useState(false);

  const [uuidOptions, setUuidOptions] = useState<UuidGenerateOptions>({ count: 5, uppercase: false, removeHyphens: false });
  const [uuidResult, setUuidResult] = useState<GeneratorItemsResult | null>(null);
  const [nanoIdOptions, setNanoIdOptions] = useState<NanoIdGenerateOptions>({ length: 21, count: 5, alphabet: null });
  const [nanoIdResult, setNanoIdResult] = useState<GeneratorItemsResult | null>(null);
  const [randomOptions, setRandomOptions] = useState<RandomValueGenerateOptions>({ mode: "integer", count: 10, min: 0, max: 100, decimalPlaces: 2, length: 16, charset: null });
  const [randomResult, setRandomResult] = useState<GeneratorItemsResult | null>(null);
  const [passwordOptions, setPasswordOptions] = useState<PasswordGenerateOptions>({ length: 16, count: 6, includeUppercase: true, includeLowercase: true, includeNumbers: true, includeSymbols: true, excludeSimilar: false });
  const [passwordResult, setPasswordResult] = useState<GeneratorItemsResult | null>(null);
  const [apiKeyOptions, setApiKeyOptions] = useState<ApiKeyGenerateOptions>({ prefix: "sk_test", length: 24, count: 5, separator: "_" });
  const [apiKeyResult, setApiKeyResult] = useState<GeneratorItemsResult | null>(null);
  const [hashInput, setHashInput] = useState("DeskForge");
  const [hashAlgorithm, setHashAlgorithm] = useState<HashAlgorithm>("sha256");
  const [hashResult, setHashResult] = useState<HashGenerateResult | null>(null);
  const [jwtPayload, setJwtPayload] = useState(`{
  "sub": "user_123",
  "role": "admin",
  "iat": 1710912000
}`);
  const [jwtHeader, setJwtHeader] = useState("");
  const [jwtSecret, setJwtSecret] = useState("deskforge-dev-secret");
  const [jwtToken, setJwtToken] = useState("");
  const [jwtGenerateResult, setJwtGenerateResult] = useState<JwtGenerateResult | null>(null);
  const [jwtDecodeResult, setJwtDecodeResult] = useState<JwtDecodeResult | null>(null);

  const [identityDocumentType, setIdentityDocumentType] = useState("");
  const [paymentBrand, setPaymentBrand] = useState("");
  const [includeProfile, setIncludeProfile] = useState(true);
  const [includeContact, setIncludeContact] = useState(true);
  const [includeAddress, setIncludeAddress] = useState(true);
  const [includeIdentity, setIncludeIdentity] = useState(false);
  const [includePayment, setIncludePayment] = useState(false);
  const [includeCompany, setIncludeCompany] = useState(true);
  const [includeAccount, setIncludeAccount] = useState(true);
  const [includePreferences, setIncludePreferences] = useState(false);
  const [includeDevice, setIncludeDevice] = useState(false);
  const [userResult, setUserResult] = useState<UserDataGenerateResult | null>(null);

  const userOptions = useMemo<UserDataGenerateOptions>(() => ({ country, count }), [country, count]);
  const timestampSnapshot = useMemo(() => {
    const now = new Date();
    const milliseconds = Date.now();
    const seconds = Math.floor(milliseconds / 1000);
    return { seconds, milliseconds, iso: now.toISOString(), local: formatDateTime(now) };
  }, [timestampVersion]);

  const visibleModules = useMemo(() => GENERATOR_MODULES.filter((item) => item.group === group), [group]);
  const currentModule = visibleModules.find((item) => item.id === activeTab) ?? visibleModules[0];

  const copyText = async (key: string, text: string) => {
    if (!text) return;
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

  const applyProfilePreset = (preset: "register" | "crm" | "commerce" | "compliance" | "full") => {
    if (preset === "register") {
      setIncludeProfile(true);
      setIncludeContact(true);
      setIncludeAddress(true);
      setIncludeCompany(false);
      setIncludeIdentity(false);
      setIncludePayment(false);
      setIncludeAccount(true);
      setIncludePreferences(true);
      setIncludeDevice(false);
      return;
    }
    if (preset === "crm") {
      setIncludeProfile(true);
      setIncludeContact(true);
      setIncludeAddress(true);
      setIncludeCompany(true);
      setIncludeIdentity(false);
      setIncludePayment(false);
      setIncludeAccount(true);
      setIncludePreferences(true);
      setIncludeDevice(true);
      return;
    }
    if (preset === "commerce") {
      setIncludeProfile(true);
      setIncludeContact(true);
      setIncludeAddress(true);
      setIncludeCompany(true);
      setIncludeIdentity(false);
      setIncludePayment(true);
      setIncludeAccount(true);
      setIncludePreferences(true);
      setIncludeDevice(true);
      return;
    }
    if (preset === "compliance") {
      setIncludeProfile(true);
      setIncludeContact(true);
      setIncludeAddress(true);
      setIncludeCompany(false);
      setIncludeIdentity(true);
      setIncludePayment(false);
      setIncludeAccount(false);
      setIncludePreferences(false);
      setIncludeDevice(false);
      return;
    }
    setIncludeProfile(true);
    setIncludeContact(true);
    setIncludeAddress(true);
    setIncludeCompany(true);
    setIncludeIdentity(true);
    setIncludePayment(true);
    setIncludeAccount(true);
    setIncludePreferences(true);
    setIncludeDevice(true);
  };
  const renderUserResult = (title: string, description: string) => (
    <ResultPanel
      title={title}
      description={description}
      output={userResult ? (jsonView ? userResult.json : userResult.text) : ""}
      meta={userResult?.meta ?? []}
      copied={copiedKey === "user-data"}
      onCopy={() => void copyText("user-data", userResult ? (jsonView ? userResult.json : userResult.text) : "")}
      toolbar={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={jsonView ? "outline" : "default"} onClick={() => setJsonView(false)}>文本</Button>
          <Button size="sm" variant={jsonView ? "default" : "outline"} onClick={() => setJsonView(true)}>JSON</Button>
        </div>
      }
    />
  );

  return (
    <PageSection className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader title="生成器中心" description="开发刚需生成器 + 用户假数据包，统一在一个工作区内生成与复制。" backTo="/" />

        <Card className="rounded-[1.5rem] border-border/60 bg-background/80">
          <CardHeader>
            <CardTitle className="text-xl">模块导航</CardTitle>
            <CardDescription>{currentModule?.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant={group === "dev" ? "default" : "outline"} onClick={() => { setGroup("dev"); setActiveTab("uuid"); }}>开发生成器</Button>
              <Button variant={group === "user" ? "default" : "outline"} onClick={() => { setGroup("user"); setActiveTab("userPersona"); }}>用户假数据</Button>
            </div>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as GeneratorModuleId)}>
              <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-2xl bg-muted/40 p-2">
                {visibleModules.map((module) => (
                  <TabsTrigger key={module.id} value={module.id} className="rounded-xl px-4 py-2">{module.label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

        {group === "dev" && (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as GeneratorModuleId)}>
            <TabsContent value="uuid"><GeneratorLayout title="UUID / GUID" description="批量生成标准 UUID。" meta={uuidResult?.meta ?? []} output={uuidResult?.text ?? ""} copied={copiedKey === "uuid"} onCopy={() => void copyText("uuid", uuidResult?.text ?? "")} onRefresh={() => void runAction(async () => setUuidResult(await invoke("generate_uuid", { options: uuidOptions })))}><NumberField label="批量数量" value={uuidOptions.count} min={1} max={100} onChange={(value) => setUuidOptions((prev) => ({ ...prev, count: value }))} /><ToggleRow label="大写输出" checked={uuidOptions.uppercase} onChange={(checked) => setUuidOptions((prev) => ({ ...prev, uppercase: checked }))} /><ToggleRow label="移除连字符" checked={uuidOptions.removeHyphens} onChange={(checked) => setUuidOptions((prev) => ({ ...prev, removeHyphens: checked }))} /></GeneratorLayout></TabsContent>
            <TabsContent value="nanoid"><GeneratorLayout title="NanoID" description="生成更短的随机 ID。" meta={nanoIdResult?.meta ?? []} output={nanoIdResult?.text ?? ""} copied={copiedKey === "nanoid"} onCopy={() => void copyText("nanoid", nanoIdResult?.text ?? "")} onRefresh={() => void runAction(async () => setNanoIdResult(await invoke("generate_nanoid", { options: nanoIdOptions })))}><NumberField label="长度" value={nanoIdOptions.length} min={8} max={128} onChange={(value) => setNanoIdOptions((prev) => ({ ...prev, length: value }))} /><NumberField label="批量数量" value={nanoIdOptions.count} min={1} max={100} onChange={(value) => setNanoIdOptions((prev) => ({ ...prev, count: value }))} /><TextField label="自定义字符集" value={nanoIdOptions.alphabet ?? ""} placeholder="留空则使用默认字符集" onChange={(value) => setNanoIdOptions((prev) => ({ ...prev, alphabet: value || null }))} /></GeneratorLayout></TabsContent>
            <TabsContent value="random"><GeneratorLayout title="随机值" description="生成整数、浮点数或随机字符串。" meta={randomResult?.meta ?? []} output={randomResult?.text ?? ""} copied={copiedKey === "random"} onCopy={() => void copyText("random", randomResult?.text ?? "")} onRefresh={() => void runAction(async () => setRandomResult(await invoke("generate_random_value", { options: randomOptions })))}><OptionButtons label="模式" options={[{ value: "integer", label: "整数" }, { value: "float", label: "浮点数" }, { value: "string", label: "字符串" }]} value={randomOptions.mode} onChange={(value) => setRandomOptions((prev) => ({ ...prev, mode: value as RandomValueGenerateOptions["mode"] }))} /><NumberField label="批量数量" value={randomOptions.count} min={1} max={100} onChange={(value) => setRandomOptions((prev) => ({ ...prev, count: value }))} />{randomOptions.mode !== "string" ? <div className="grid gap-4 sm:grid-cols-3"><NumberField label="最小值" value={randomOptions.min} onChange={(value) => setRandomOptions((prev) => ({ ...prev, min: value }))} /><NumberField label="最大值" value={randomOptions.max} onChange={(value) => setRandomOptions((prev) => ({ ...prev, max: value }))} />{randomOptions.mode === "float" ? <NumberField label="小数位" value={randomOptions.decimalPlaces} min={0} max={8} onChange={(value) => setRandomOptions((prev) => ({ ...prev, decimalPlaces: value }))} /> : <div />}</div> : <div className="grid gap-4 sm:grid-cols-2"><NumberField label="字符串长度" value={randomOptions.length} min={1} max={256} onChange={(value) => setRandomOptions((prev) => ({ ...prev, length: value }))} /><TextField label="字符集" value={randomOptions.charset ?? ""} placeholder="留空使用默认字符集" onChange={(value) => setRandomOptions((prev) => ({ ...prev, charset: value || null }))} /></div>}</GeneratorLayout></TabsContent>
            <TabsContent value="password"><GeneratorLayout title="密码生成器" description="按字符规则生成测试密码。" meta={passwordResult?.meta ?? []} output={passwordResult?.text ?? ""} copied={copiedKey === "password"} onCopy={() => void copyText("password", passwordResult?.text ?? "")} onRefresh={() => void runAction(async () => setPasswordResult(await invoke("generate_password", { options: passwordOptions })))}><div className="grid gap-4 sm:grid-cols-2"><NumberField label="密码长度" value={passwordOptions.length} min={4} max={256} onChange={(value) => setPasswordOptions((prev) => ({ ...prev, length: value }))} /><NumberField label="批量数量" value={passwordOptions.count} min={1} max={100} onChange={(value) => setPasswordOptions((prev) => ({ ...prev, count: value }))} /></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><ToggleRow label="大写字母" checked={passwordOptions.includeUppercase} onChange={(checked) => setPasswordOptions((prev) => ({ ...prev, includeUppercase: checked }))} /><ToggleRow label="小写字母" checked={passwordOptions.includeLowercase} onChange={(checked) => setPasswordOptions((prev) => ({ ...prev, includeLowercase: checked }))} /><ToggleRow label="数字" checked={passwordOptions.includeNumbers} onChange={(checked) => setPasswordOptions((prev) => ({ ...prev, includeNumbers: checked }))} /><ToggleRow label="符号" checked={passwordOptions.includeSymbols} onChange={(checked) => setPasswordOptions((prev) => ({ ...prev, includeSymbols: checked }))} /><ToggleRow label="排除易混字符" checked={passwordOptions.excludeSimilar} onChange={(checked) => setPasswordOptions((prev) => ({ ...prev, excludeSimilar: checked }))} /></div></GeneratorLayout></TabsContent>
            <TabsContent value="apiKey"><GeneratorLayout title="API Key / Token" description="生成带前缀的随机 key。" meta={apiKeyResult?.meta ?? []} output={apiKeyResult?.text ?? ""} copied={copiedKey === "apiKey"} onCopy={() => void copyText("apiKey", apiKeyResult?.text ?? "")} onRefresh={() => void runAction(async () => setApiKeyResult(await invoke("generate_api_key", { options: apiKeyOptions })))}><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><TextField label="前缀" value={apiKeyOptions.prefix} onChange={(value) => setApiKeyOptions((prev) => ({ ...prev, prefix: value }))} /><NumberField label="随机段长度" value={apiKeyOptions.length} min={8} max={128} onChange={(value) => setApiKeyOptions((prev) => ({ ...prev, length: value }))} /><NumberField label="批量数量" value={apiKeyOptions.count} min={1} max={100} onChange={(value) => setApiKeyOptions((prev) => ({ ...prev, count: value }))} /><TextField label="分隔符" value={apiKeyOptions.separator} onChange={(value) => setApiKeyOptions((prev) => ({ ...prev, separator: value }))} /></div></GeneratorLayout></TabsContent>
            <TabsContent value="hash"><GeneratorLayout title="Hash" description="计算输入内容的 MD5 / SHA 摘要。" meta={hashResult?.meta ?? []} output={hashResult?.value ?? ""} copied={copiedKey === "hash"} onCopy={() => void copyText("hash", hashResult?.value ?? "")} onRefresh={() => void runAction(async () => setHashResult(await invoke("generate_hash", { options: { input: hashInput, algorithm: hashAlgorithm } })))}><OptionButtons label="算法" options={HASH_ALGORITHMS} value={hashAlgorithm} onChange={(value) => setHashAlgorithm(value as HashAlgorithm)} /><TextAreaField label="输入内容" value={hashInput} onChange={setHashInput} minHeight="min-h-40" /></GeneratorLayout></TabsContent>
            <TabsContent value="jwt"><div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"><Card className="rounded-[1.5rem] border-border/60 bg-background/80"><CardHeader><CardTitle className="text-xl">JWT Mock</CardTitle><CardDescription>本地生成 HS256 签名 JWT，也支持解析现有 token。</CardDescription></CardHeader><CardContent className="space-y-5"><TextField label="Secret" value={jwtSecret} onChange={setJwtSecret} /><TextAreaField label="Payload JSON" value={jwtPayload} onChange={setJwtPayload} minHeight="min-h-44" /><TextAreaField label="Header JSON（可选）" value={jwtHeader} onChange={setJwtHeader} placeholder='留空默认 {"alg":"HS256","typ":"JWT"}' minHeight="min-h-28" /><div className="flex flex-wrap gap-2"><Button onClick={() => void runAction(async () => { const result = await invoke<JwtGenerateResult>("generate_jwt_mock", { options: { payloadJson: jwtPayload, secret: jwtSecret, headerJson: jwtHeader } }); setJwtGenerateResult(result); setJwtToken(result.token); })}>生成 JWT</Button><Button variant="outline" onClick={() => void runAction(async () => setJwtDecodeResult(await invoke<JwtDecodeResult>("decode_jwt_mock", { options: { token: jwtToken } })))}>解析 JWT</Button></div><TextAreaField label="JWT Token" value={jwtToken} onChange={setJwtToken} minHeight="min-h-32" /></CardContent></Card><ResultPanel title="结果" description="生成后会展示 token、header、payload 和签名信息。" output={`${jwtDecodeResult?.headerPretty ?? jwtGenerateResult?.headerPretty ?? ""}

${jwtDecodeResult?.payloadPretty ?? jwtGenerateResult?.payloadPretty ?? ""}

${jwtDecodeResult?.signature ?? ""}`} meta={jwtGenerateResult?.meta ?? jwtDecodeResult?.meta ?? []} copied={copiedKey === "jwt"} onCopy={() => void copyText("jwt", jwtToken)} /></div></TabsContent>
            <TabsContent value="timestamp"><Card className="rounded-[1.5rem] border-border/60 bg-background/80"><CardHeader><CardTitle className="text-xl">时间戳快捷生成</CardTitle><CardDescription>快速拿当前时间的秒级、毫秒级、本地格式和 ISO 格式。</CardDescription></CardHeader><CardContent className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"><div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><TimestampCard label="秒级时间戳" value={String(timestampSnapshot.seconds)} onCopy={() => void copyText("ts-seconds", String(timestampSnapshot.seconds))} copied={copiedKey === "ts-seconds"} /><TimestampCard label="毫秒时间戳" value={String(timestampSnapshot.milliseconds)} onCopy={() => void copyText("ts-ms", String(timestampSnapshot.milliseconds))} copied={copiedKey === "ts-ms"} /><TimestampCard label="本地时间" value={timestampSnapshot.local} onCopy={() => void copyText("ts-local", timestampSnapshot.local)} copied={copiedKey === "ts-local"} /><TimestampCard label="ISO 8601" value={timestampSnapshot.iso} onCopy={() => void copyText("ts-iso", timestampSnapshot.iso)} copied={copiedKey === "ts-iso"} /></div><Button onClick={() => setTimestampVersion((value) => value + 1)} variant="outline"><RefreshCw className="h-4 w-4" />刷新当前时间</Button></div><Card className="rounded-[1.25rem] border-border/60 bg-muted/20 shadow-none"><CardHeader><CardTitle className="text-lg">深入转换</CardTitle><CardDescription>复杂时间解析、格式化和反向转换继续使用现有工具页。</CardDescription></CardHeader><CardContent><Button asChild><Link to="/feature/timestamp-converter">打开时间戳转换</Link></Button></CardContent></Card></CardContent></Card></TabsContent>
          </Tabs>
        )}

        {group === "user" && (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as GeneratorModuleId)}>
            <TabsContent value="userPersona"><UserLayout country={country} setCountry={setCountry} count={count} setCount={setCount} onGenerate={() => void runAction(async () => setUserResult(await invoke("generate_user_persona", { options: userOptions })))}>{renderUserResult("个人资料", "生成姓名、性别、年龄、生日和用户名。")}</UserLayout></TabsContent>
            <TabsContent value="userContact"><UserLayout country={country} setCountry={setCountry} count={count} setCount={setCount} onGenerate={() => void runAction(async () => setUserResult(await invoke("generate_user_contact", { options: userOptions })))}>{renderUserResult("联系方式", "生成邮箱、手机号等测试联系数据。")}</UserLayout></TabsContent>
            <TabsContent value="userAddress"><UserLayout country={country} setCountry={setCountry} count={count} setCount={setCount} onGenerate={() => void runAction(async () => setUserResult(await invoke("generate_user_address", { options: userOptions })))}>{renderUserResult("地址与地域", "生成符合国家格式的地址、邮编和地区层级。")}</UserLayout></TabsContent>
            <TabsContent value="userCompany"><UserLayout country={country} setCountry={setCountry} count={count} setCount={setCount} onGenerate={() => void runAction(async () => setUserResult(await invoke("generate_user_company", { options: userOptions })))}>{renderUserResult("公司与职业", "生成公司名、职位和部门。")}</UserLayout></TabsContent>
            <TabsContent value="identity"><UserLayout country={country} setCountry={setCountry} count={count} setCount={setCount} extra={<TextField label="证件类型（可选）" value={identityDocumentType} onChange={setIdentityDocumentType} placeholder="留空使用国家默认类型" />} onGenerate={() => void runAction(async () => setUserResult(await invoke("generate_identity_document", { options: { country, count, documentType: identityDocumentType } as IdentityGenerateOptions })))}>{renderUserResult("身份字段", "生成规则型证件号，仅限测试用途。")}</UserLayout></TabsContent>
            <TabsContent value="payment"><UserLayout country={country} setCountry={setCountry} count={count} setCount={setCount} extra={<TextField label="银行卡品牌（可选）" value={paymentBrand} onChange={setPaymentBrand} placeholder="如 visa / mastercard / unionpay / jcb" />} onGenerate={() => void runAction(async () => setUserResult(await invoke("generate_payment_card", { options: { country, count, brand: paymentBrand } as PaymentCardGenerateOptions })))}>{renderUserResult("支付标识", "生成银行卡号、品牌、有效期和 CVV。")}</UserLayout></TabsContent>
            <TabsContent value="userProfile"><UserLayout country={country} setCountry={setCountry} count={count} setCount={setCount} extra={<div className="space-y-4"><OptionButtons label="业务预设" options={[{ value: "register", label: "注册测试" }, { value: "crm", label: "CRM 客户" }, { value: "commerce", label: "电商用户" }, { value: "compliance", label: "实名审核" }, { value: "full", label: "全量档案" }]} value="custom" onChange={(value) => applyProfilePreset(value as "register" | "crm" | "commerce" | "compliance" | "full")} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><ToggleRow label="基础资料" checked={includeProfile} onChange={setIncludeProfile} /><ToggleRow label="联系方式" checked={includeContact} onChange={setIncludeContact} /><ToggleRow label="地址地域" checked={includeAddress} onChange={setIncludeAddress} /><ToggleRow label="公司职业" checked={includeCompany} onChange={setIncludeCompany} /><ToggleRow label="身份字段" checked={includeIdentity} onChange={setIncludeIdentity} /><ToggleRow label="支付信息" checked={includePayment} onChange={setIncludePayment} /><ToggleRow label="账户信息" checked={includeAccount} onChange={setIncludeAccount} /><ToggleRow label="偏好设置" checked={includePreferences} onChange={setIncludePreferences} /><ToggleRow label="设备画像" checked={includeDevice} onChange={setIncludeDevice} /></div></div>} onGenerate={() => void runAction(async () => setUserResult(await invoke("generate_user_profile", { options: { country, count, includeProfile, includeContact, includeAddress, includeCompany, includeIdentity, includePayment, includeAccount, includePreferences, includeDevice } as UserProfileGenerateOptions })))}>{renderUserResult("组合档案 JSON", "按字段块自由组合用户档案，适合注册、CRM、电商、实名和联调场景。")}</UserLayout></TabsContent>
          </Tabs>
        )}
      </div>
    </PageSection>
  );
}

function UserLayout({ country, setCountry, count, setCount, extra, onGenerate, children }: { country: CountryPreset; setCountry: (value: CountryPreset) => void; count: number; setCount: (value: number) => void; extra?: React.ReactNode; onGenerate: () => void; children: React.ReactNode; }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <Card className="rounded-[1.5rem] border-border/60 bg-background/80">
        <CardHeader><CardTitle className="text-xl">生成设置</CardTitle><CardDescription>选择国家、数量和可选规则后生成测试数据。</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <CountrySelector value={country} onChange={setCountry} />
          <NumberField label="批量数量" value={count} min={1} max={100} onChange={setCount} />
          {extra}
          <Button onClick={onGenerate}>生成结果</Button>
        </CardContent>
      </Card>
      {children}
    </div>
  );
}

function CountrySelector({ value, onChange }: { value: CountryPreset; onChange: (value: CountryPreset) => void }) {
  return <OptionButtons label="国家 / 地域" options={COUNTRY_PRESETS.map((item) => ({ value: item.value, label: item.label }))} value={value} onChange={(next) => onChange(next as CountryPreset)} />;
}

function GeneratorLayout({ title, description, meta, output, onCopy, copied, onRefresh, children }: { title: string; description: string; meta: string[]; output: string; onCopy: () => void; copied: boolean; onRefresh: () => void; children: React.ReactNode; }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <Card className="rounded-[1.5rem] border-border/60 bg-background/80">
        <CardHeader><CardTitle className="text-xl">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
        <CardContent className="space-y-5">{children}<Button onClick={onRefresh}>生成结果</Button></CardContent>
      </Card>
      <ResultPanel title="输出结果" description="支持批量输出和一键复制。" output={output} meta={meta} copied={copied} onCopy={onCopy} />
    </div>
  );
}

function ResultPanel({ title, description, output, meta, copied, onCopy, toolbar }: { title: string; description: string; output: string; meta: string[]; copied: boolean; onCopy: () => void; toolbar?: React.ReactNode; }) {
  return (
    <Card className="rounded-[1.5rem] border-border/60 bg-background/80">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div><CardTitle className="text-xl">{title}</CardTitle><CardDescription>{description}</CardDescription></div>
          <div className="flex flex-wrap items-center gap-2">{toolbar}<Button variant="outline" size="sm" onClick={onCopy} disabled={!output}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "已复制" : "复制"}</Button></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {meta.length > 0 ? <div className="flex flex-wrap gap-2">{meta.map((item) => <MetaChip key={item} text={item} />)}</div> : null}
        <textarea value={output} readOnly className="min-h-[28rem] w-full rounded-2xl border border-border bg-muted/30 p-4 font-mono text-sm outline-none" />
      </CardContent>
    </Card>
  );
}

function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number }) {
  return <div className="space-y-2"><Label>{label}</Label><Input type="number" value={value} min={min} max={max} onChange={(event) => onChange(Number(event.target.value))} /></div>;
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <div className="space-y-2"><Label>{label}</Label><Input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></div>;
}

function TextAreaField({ label, value, onChange, placeholder, minHeight = "min-h-28" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; minHeight?: string }) {
  return <div className="space-y-2"><Label>{label}</Label><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${minHeight} w-full rounded-2xl border border-border bg-muted/30 p-4 font-mono text-sm outline-none`} spellCheck={false} /></div>;
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-3"><span className="text-sm font-medium">{label}</span><Button type="button" size="sm" variant={checked ? "default" : "outline"} onClick={() => onChange(!checked)}>{checked ? "开启" : "关闭"}</Button></div>;
}

function OptionButtons({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label>{label}</Label><div className="flex flex-wrap gap-2">{options.map((option) => <Button key={option.value} type="button" size="sm" variant={value === option.value ? "default" : "outline"} onClick={() => onChange(option.value)}>{option.label}</Button>)}</div></div>;
}

function MetaChip({ text }: { text: string }) {
  return <div className="rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs text-muted-foreground">{text}</div>;
}

function TimestampCard({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return <div className="rounded-[1.2rem] border border-border/60 bg-background/70 p-4"><div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div><div className="mt-2 break-all font-mono text-sm font-semibold">{value}</div><Button variant="outline" size="sm" className="mt-3" onClick={onCopy}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "已复制" : "复制"}</Button></div>;
}



