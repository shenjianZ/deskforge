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
    setDefaultIndent,
    setDefaultCodeIndent,
    setAutoCollapseInput,
    setDefaultJsonResultView,
    setWrapLongLines,
    reset,
  } = usePreferencesStore();

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
          </div>

          <Button variant="outline" className="gap-2" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            恢复默认设置
          </Button>
        </CardContent>
      </Card>
    </PageSection>
  );
}
