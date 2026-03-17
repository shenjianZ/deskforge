import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { usePreferencesStore } from "@/stores/preferencesStore";
import { PageSection } from "@/components/layout/PageSection";

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
        const enabled = await invoke<boolean>('plugin:autostart|is_enabled');
        if (!cancelled) {
          setLaunchOnStartup(enabled);
          setAutostartError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setAutostartError(error instanceof Error ? error.message : '读取开机自启状态失败');
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
        await invoke('plugin:autostart|enable');
      } else {
        await invoke('plugin:autostart|disable');
      }
      setLaunchOnStartup(nextValue);
    } catch (error) {
      setAutostartError(error instanceof Error ? error.message : '更新开机自启状态失败');
    }
  };

  return (
    <PageSection className="space-y-6">
      <Card className="border-border/60 bg-card/85 shadow-sm">
        <CardHeader>
          <CardTitle>外观与偏好</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="text-sm font-medium">主题</div>
            <div className="flex flex-wrap gap-2">
              {(['light', 'dark', 'system'] as const).map((value) => (
                <Button
                  key={value}
                  variant={theme === value ? 'default' : 'outline'}
                  onClick={() => setTheme(value)}
                >
                  {value === 'light' ? '浅色' : value === 'dark' ? '深色' : '跟随系统'}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium">通用格式化缩进</div>
            <div className="flex gap-2">
              {[2, 4].map((value) => (
                <Button
                  key={value}
                  variant={defaultIndent === value ? 'default' : 'outline'}
                  onClick={() => setDefaultIndent(value as 2 | 4)}
                >
                  {value} 空格
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium">代码工具默认缩进</div>
            <div className="flex gap-2">
              {[2, 4, 8].map((value) => (
                <Button
                  key={value}
                  variant={defaultCodeIndent === value ? 'default' : 'outline'}
                  onClick={() => setDefaultCodeIndent(value as 2 | 4 | 8)}
                >
                  {value} 空格
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium">JSON 默认结果视图</div>
            <div className="flex gap-2">
              {(['tree', 'code'] as const).map((value) => (
                <Button
                  key={value}
                  variant={defaultJsonResultView === value ? 'default' : 'outline'}
                  onClick={() => setDefaultJsonResultView(value)}
                >
                  {value === 'tree' ? '树结构' : '代码'}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant={autoCollapseInput ? 'default' : 'outline'}
              onClick={() => setAutoCollapseInput(!autoCollapseInput)}
            >
              格式化后自动收起输入：{autoCollapseInput ? '开启' : '关闭'}
            </Button>
            <Button
              variant={wrapLongLines ? 'default' : 'outline'}
              onClick={() => setWrapLongLines(!wrapLongLines)}
            >
              结果长行自动换行：{wrapLongLines ? '开启' : '关闭'}
            </Button>
            <Button
              variant={launchOnStartup ? 'default' : 'outline'}
              onClick={() => void handleAutostartToggle()}
              disabled={!isAutostartReady}
            >
              开机自启：{isAutostartReady ? (launchOnStartup ? '开启' : '关闭') : '读取中'}
            </Button>
          </div>

          {autostartError ? (
            <p className="text-sm text-destructive">{autostartError}</p>
          ) : null}

          <Button variant="outline" className="gap-2" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            恢复默认设置
          </Button>
        </CardContent>
      </Card>
    </PageSection>
  );
}
