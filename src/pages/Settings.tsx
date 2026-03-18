import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Palette, RotateCcw, Rocket, TextCursorInput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme-provider";
import { PageHeader } from "@/components/layout/PageHeader";
import { usePreferencesStore } from "@/stores/preferencesStore";
import { PageSection } from "@/components/layout/PageSection";
import { cn } from "@/lib/utils";

function SettingSegment<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={String(option.value)}
            variant="ghost"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full border px-4",
              value === option.value
                ? "border-slate-950 bg-slate-950 text-white hover:bg-slate-800 dark:border-white dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
                : "border-border/60 bg-background/80 text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function ToggleChip({
  active,
  label,
  value,
  onClick,
  disabled,
}: {
  active: boolean;
  label: string;
  value: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-between rounded-[1.2rem] border px-4 py-4 text-left transition",
        active
          ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-white dark:bg-white dark:text-slate-950"
          : "border-border/60 bg-background/75 hover:border-border hover:bg-background",
        disabled && "cursor-wait opacity-70"
      )}
    >
      <span className="font-medium">{label}</span>
      <Badge
        variant="outline"
        className={cn(
          "rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]",
          active
            ? "border-white/12 bg-white/8 text-white dark:border-slate-200 dark:bg-slate-100 dark:text-slate-700"
            : "border-border/60 text-muted-foreground"
        )}
      >
        {value}
      </Badge>
    </button>
  );
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const {
    defaultIndent,
    defaultCodeIndent,
    autoCollapseInput,
    defaultJsonResultView,
    wrapLongLines,
    launchOnStartup,
    setDefaultIndent,
    setDefaultCodeIndent,
    setAutoCollapseInput,
    setDefaultJsonResultView,
    setWrapLongLines,
    setLaunchOnStartup,
    reset,
  } = usePreferencesStore();
  const [isAutostartReady, setIsAutostartReady] = useState(false);
  const [autostartError, setAutostartError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const syncAutostartState = async () => {
      try {
        const enabled = await invoke<boolean>("plugin:autostart|is_enabled");
        if (!cancelled) {
          setLaunchOnStartup(enabled);
          setAutostartError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setAutostartError(error instanceof Error ? error.message : "读取开机自启状态失败");
        }
      } finally {
        if (!cancelled) {
          setIsAutostartReady(true);
        }
      }
    };

    void syncAutostartState();

    return () => {
      cancelled = true;
    };
  }, [setLaunchOnStartup]);

  const handleAutostartToggle = async () => {
    const nextValue = !launchOnStartup;

    try {
      setAutostartError(null);
      if (nextValue) {
        await invoke("plugin:autostart|enable");
      } else {
        await invoke("plugin:autostart|disable");
      }
      setLaunchOnStartup(nextValue);
    } catch (error) {
      setAutostartError(error instanceof Error ? error.message : "更新开机自启状态失败");
    }
  };

  return (
    <PageSection className="max-w-[1480px] space-y-6">
      <PageHeader title="设置" backTo="/" />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-[1.9rem] border border-border/60 bg-background/72 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(249,115,22,0.16),rgba(234,179,8,0.12))] text-[rgb(234,88,12)] dark:text-[rgb(255,184,107)]">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Appearance</div>
                <div className="text-lg font-semibold">主题与视觉偏好</div>
              </div>
            </div>
            <div className="mt-5">
              <SettingSegment
                label="主题模式"
                value={theme}
                onChange={setTheme}
                options={[
                  { value: "light", label: "浅色" },
                  { value: "dark", label: "深色" },
                  { value: "system", label: "跟随系统" },
                ]}
              />
            </div>
          </div>

          <div className="rounded-[1.9rem] border border-border/60 bg-background/72 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(59,130,246,0.14))] text-sky-600 dark:text-sky-300">
                <TextCursorInput className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Formatting</div>
                <div className="text-lg font-semibold">输出与格式默认值</div>
              </div>
            </div>
            <div className="mt-5 space-y-6">
              <SettingSegment
                label="通用格式化缩进"
                value={defaultIndent}
                onChange={(value) => setDefaultIndent(value as 2 | 4)}
                options={[
                  { value: 2, label: "2 空格" },
                  { value: 4, label: "4 空格" },
                ]}
              />
              <SettingSegment
                label="代码工具默认缩进"
                value={defaultCodeIndent}
                onChange={(value) => setDefaultCodeIndent(value as 2 | 4 | 8)}
                options={[
                  { value: 2, label: "2 空格" },
                  { value: 4, label: "4 空格" },
                  { value: 8, label: "8 空格" },
                ]}
              />
              <SettingSegment
                label="JSON 默认结果视图"
                value={defaultJsonResultView}
                onChange={setDefaultJsonResultView}
                options={[
                  { value: "tree", label: "树结构" },
                  { value: "code", label: "代码视图" },
                ]}
              />
            </div>
          </div>

          <div className="rounded-[1.9rem] border border-border/60 bg-background/72 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(34,197,94,0.18),rgba(16,185,129,0.14))] text-emerald-600 dark:text-emerald-300">
                <Rocket className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Runtime</div>
                <div className="text-lg font-semibold">交互节奏与启动行为</div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <ToggleChip
                active={autoCollapseInput}
                label="格式化后自动收起输入"
                value={autoCollapseInput ? "On" : "Off"}
                onClick={() => setAutoCollapseInput(!autoCollapseInput)}
              />
              <ToggleChip
                active={wrapLongLines}
                label="结果长行自动换行"
                value={wrapLongLines ? "On" : "Off"}
                onClick={() => setWrapLongLines(!wrapLongLines)}
              />
              <ToggleChip
                active={launchOnStartup}
                label="开机自启"
                value={isAutostartReady ? (launchOnStartup ? "On" : "Off") : "Loading"}
                onClick={() => void handleAutostartToggle()}
                disabled={!isAutostartReady}
              />
            </div>
            {autostartError ? <p className="mt-4 text-sm text-destructive">{autostartError}</p> : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.9rem] border border-border/60 bg-background/72 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">状态</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.2rem] border border-border/60 bg-background/75 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">主题</div>
                <div className="mt-2 text-lg font-semibold text-foreground">
                  {theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System"}
                </div>
              </div>
              <div className="rounded-[1.2rem] border border-border/60 bg-background/75 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">JSON 视图</div>
                <div className="mt-2 text-lg font-semibold text-foreground">{defaultJsonResultView}</div>
              </div>
              <div className="rounded-[1.2rem] border border-border/60 bg-background/75 p-4 sm:col-span-2">
                <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">开机自启</div>
                <div className="mt-2 text-lg font-semibold text-foreground">
                  {isAutostartReady ? (launchOnStartup ? "Enabled" : "Disabled") : "Loading"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-border/60 bg-background/72 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">重置</div>
            <div className="mt-3 text-lg font-semibold">恢复默认设置</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              清空当前偏好，恢复系统默认状态。
            </p>
            <Button variant="outline" className="mt-5 w-full rounded-full" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
              恢复默认设置
            </Button>
          </div>
        </div>
      </section>
    </PageSection>
  );
}
