import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Keyboard, Radio, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { cn } from "@/lib/utils";

interface KeycastState {
  is_listening: boolean;
  is_overlay_visible: boolean;
}

interface KeycastDisplayPayload {
  text: string;
}

interface KeycastOverlayConfig {
  x: number;
  y: number;
  theme: KeycastTheme;
}

type KeycastTheme =
  | "keycaps-dark"
  | "keycaps-light"
  | "broadcast-orange"
  | "broadcast-green"
  | "minimal-dark"
  | "minimal-light"
  | "glass-soft"
  | "fresh-mint"
  | "sky-card"
  | "terminal"
  | "neon-cyan"
  | "paper-card";

const KEYCAST_THEME_OPTIONS: Array<{ value: KeycastTheme; label: string; description: string }> = [
  { value: "keycaps-dark", label: "Keycaps Dark", description: "深色机械键帽，稳重且专业。" },
  { value: "keycaps-light", label: "Keycaps Light", description: "浅色键帽，更轻更明快。" },
  { value: "broadcast-orange", label: "Broadcast Orange", description: "录屏提示条，醒目直接。" },
  { value: "broadcast-green", label: "Broadcast Green", description: "更清新的演示提示条。" },
  { value: "minimal-dark", label: "Minimal Dark", description: "极简深色，无多余装饰。" },
  { value: "minimal-light", label: "Minimal Light", description: "极简浅色，适合清爽风格。" },
  { value: "glass-soft", label: "Glass Soft", description: "柔和玻璃质感，不做硬边框。" },
  { value: "fresh-mint", label: "Fresh Mint", description: "清新薄荷绿，轻盈自然。" },
  { value: "sky-card", label: "Sky Card", description: "通透浅蓝卡片，轻快干净。" },
  { value: "terminal", label: "Terminal", description: "终端风，信息感更强。" },
  { value: "neon-cyan", label: "Neon Cyan", description: "青色霓虹，科技感更强。" },
  { value: "paper-card", label: "Paper Card", description: "纸片卡片感，柔和不发光。" },
];

function splitKeys(text: string) {
  return text.split(" + ").filter(Boolean);
}

function getThemeMode(theme: KeycastTheme) {
  if (theme === "keycaps-dark" || theme === "keycaps-light") return "tokens";
  return "text";
}

function getThemeClasses(theme: KeycastTheme, active: boolean) {
  const selected = active ? "ring-2 ring-primary/70" : "ring-1 ring-border/50";
  const styles: Record<KeycastTheme, string> = {
    "keycaps-dark": "border-slate-700 bg-slate-950 text-white",
    "keycaps-light": "border-slate-200 bg-slate-50 text-slate-900",
    "broadcast-orange": "border-orange-300/70 bg-slate-950 text-white",
    "broadcast-green": "border-emerald-300/70 bg-emerald-950 text-white",
    "minimal-dark": "border-slate-800 bg-slate-900 text-slate-100",
    "minimal-light": "border-stone-200 bg-white text-stone-900",
    "glass-soft": "border-white/20 bg-slate-200/60 text-slate-900",
    "fresh-mint": "border-emerald-200 bg-emerald-50 text-emerald-950",
    "sky-card": "border-sky-200 bg-sky-50 text-sky-950",
    terminal: "border-emerald-500/40 bg-black text-emerald-300",
    "neon-cyan": "border-cyan-400/60 bg-slate-950 text-cyan-200",
    "paper-card": "border-amber-200 bg-stone-50 text-stone-900",
  };
  return `${selected} ${styles[theme]}`;
}

function KeycastThemePreview({ theme, text, active }: { theme: KeycastTheme; text: string; active: boolean }) {
  const keys = splitKeys(text);
  const mode = getThemeMode(theme);
  const accent =
    theme === "broadcast-orange" ? "bg-orange-400" :
    theme === "broadcast-green" ? "bg-emerald-400" :
    theme === "neon-cyan" ? "bg-cyan-400" :
    theme === "terminal" ? "bg-emerald-400" :
    "bg-current/0";
  if (mode === "text") {
    return (
      <div className={cn("rounded-3xl border p-4 shadow-lg transition", getThemeClasses(theme, active), theme === "glass-soft" && "backdrop-blur-xl")}>
        <div className={cn("mb-3 h-1.5 w-20 rounded-full", accent)} />
        <div className="text-[10px] uppercase tracking-[0.32em] opacity-60">Keycast Theme</div>
        <div className={cn("mt-3 tracking-tight", theme.startsWith("broadcast") ? "text-2xl font-black" : "text-2xl font-semibold")}>{text}</div>
      </div>
    );
  }
  return (
    <div className={cn("rounded-3xl border p-4 shadow-lg transition", getThemeClasses(theme, active))}>
      <div className="mb-3 text-[10px] uppercase tracking-[0.32em] opacity-60">Keycaps Theme</div>
      <div className="flex flex-wrap items-center gap-2">
        {keys.map((key) => (
          <span key={`${theme}-${key}`} className={cn("rounded-2xl px-3 py-2 text-lg font-semibold shadow-inner", theme === "keycaps-light" ? "border border-slate-200 bg-white text-slate-900" : "border border-white/10 bg-white/10 text-white")}>
            {key}
          </span>
        ))}
      </div>
    </div>
  );
}

export function KeycastPage() {
  const [state, setState] = useState<KeycastState>({ is_listening: false, is_overlay_visible: false });
  const [lastText, setLastText] = useState("等待开始监听");
  const [config, setConfig] = useState<KeycastOverlayConfig>({
    x: 24,
    y: 24,
    theme: "keycaps-dark",
  });

  useEffect(() => {
    void invoke<KeycastState>("get_keycast_state").then(setState);
    void invoke<KeycastOverlayConfig>("get_keycast_overlay_config").then(setConfig);
    const unlisten = listen<KeycastDisplayPayload>("keycast:display", (event) => {
      if (event.payload?.text) setLastText(event.payload.text);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  const toggle = async () => {
    if (state.is_listening) {
      await invoke("stop_keycast");
      setState({ is_listening: false, is_overlay_visible: false });
      return;
    }
    await invoke("start_keycast");
    setState({ is_listening: true, is_overlay_visible: true });
  };

  const applyOverlayConfig = async () => {
    const next = await invoke<KeycastOverlayConfig>("update_keycast_overlay_config", { config });
    setConfig(next);
  };

  const updateField = (key: keyof KeycastOverlayConfig, value: string) => {
    const parsed = Number(value);
    setConfig((current) => ({ ...current, [key]: Number.isFinite(parsed) ? parsed : 0 }));
  };

  const updateTheme = (theme: KeycastTheme) => {
    setConfig((current) => ({ ...current, theme }));
  };

  return (
    <PageSection className="max-w-5xl space-y-6">
      <PageHeader title="按键屏显" backTo="/" />
      <Card className="border-border/60 bg-card/85 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Keyboard className="h-5 w-5" />全局按键悬浮显示</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void toggle()} className="gap-2">
              {state.is_listening ? <Square className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
              {state.is_listening ? "停止监听" : "开始监听"}
            </Button>
            <div className="text-sm text-muted-foreground">
              {state.is_listening ? "监听中，按键时会在设定坐标显示悬浮提示" : "未监听"}
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/70 p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Latest</div>
            <div className="mt-3 text-3xl font-semibold tracking-tight">{lastText}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/70 p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Themes</div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {KEYCAST_THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateTheme(option.value)}
                  className={cn("rounded-[28px] p-1 text-left transition", config.theme === option.value ? "ring-2 ring-primary/70" : "ring-1 ring-border/50")}
                >
                  <KeycastThemePreview theme={option.value} text={lastText} active={config.theme === option.value} />
                  <div className="px-2 pb-2 pt-3">
                    <div className="text-sm font-semibold">{option.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{option.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/70 p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Overlay</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input value={config.x} type="number" onChange={(event) => updateField("x", event.target.value)} placeholder="X" />
              <Input value={config.y} type="number" onChange={(event) => updateField("y", event.target.value)} placeholder="Y" />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button variant="outline" onClick={() => void applyOverlayConfig()}>应用设置</Button>
              <div className="text-sm text-muted-foreground">设置显示坐标，单位为逻辑像素。</div>
            </div>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>1. 点击开始监听后，仅在按键发生时显示悬浮提示。</p>
            <p>2. 支持组合键显示，例如 Ctrl + Shift + I。</p>
            <p>3. 你可以调整悬浮框的 X、Y 坐标，点击“应用设置”立即生效。</p>
          </div>
        </CardContent>
      </Card>
    </PageSection>
  );
}
