import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Copy, Check, Droplet, RefreshCw } from 'lucide-react';
import { PageSection } from '@/components/layout/PageSection';
import type { ColorInfo } from '@/types/color';

interface ColorHistory {
  color: ColorInfo;
  timestamp: number;
}

export function ColorPickerPage() {
  const [currentColor, setCurrentColor] = useState<ColorInfo | null>(null);
  const [history, setHistory] = useState<ColorHistory[]>([]);
  const [copied, setCopied] = useState<string>('');
  const [isPicking, setIsPicking] = useState(false);

  // 监听从取色器窗口返回的颜色
  useEffect(() => {
    const unlistenPicked = listen<ColorInfo>('color-picked', (event) => {
      setCurrentColor(event.payload);
      setHistory(prev => [{ color: event.payload, timestamp: Date.now() }, ...prev].slice(0, 10));
      setIsPicking(false);
    });

    const unlistenCancelled = listen('color-picker-cancelled', () => {
      setIsPicking(false);
    });

    return () => {
      unlistenPicked.then(fn => fn());
      unlistenCancelled.then(fn => fn());
    };
  }, []);

  // 开始拾色
  const pickColor = useCallback(async () => {
    try {
      setIsPicking(true);

      // 调用启动取色器命令，打开透明遮罩窗口
      await invoke('start_color_picker');
    } catch (error) {
      console.error('拾色失败:', error);
      alert('取色失败: ' + String(error));
      setIsPicking(false);
    }
  }, []);

  // 复制到剪贴板
  const copyToClipboard = useCallback(async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(''), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  }, []);

  return (
    <PageSection className="max-w-4xl space-y-6">
          {/* 拾色按钮 */}
          <Card className="border-border/60 bg-card/85 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">屏幕取色</h3>
                  <p className="text-sm text-muted-foreground">
                    点击按钮后，窗口会隐藏。移动鼠标到目标位置，点击左键确认取色。
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={pickColor}
                  disabled={isPicking}
                  className="gap-2"
                >
                  {isPicking ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      移动鼠标并点击...
                    </>
                  ) : (
                    <>
                      <Droplet className="w-5 h-5" />
                      开始拾色
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 当前颜色 */}
          {currentColor && (
            <Card className="border-border/60 bg-card/85 shadow-sm">
              <CardHeader>
                <CardTitle>当前颜色</CardTitle>
                <CardDescription>
                  位置: ({currentColor.x}, {currentColor.y})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 颜色预览 */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-32 h-32 rounded-lg shadow-lg border-4 border-border"
                    style={{ backgroundColor: currentColor.hex }}
                  />
                  <div className="flex-1 space-y-3">
                    {/* HEX */}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">HEX</Badge>
                      <Input
                        value={currentColor.hex}
                        readOnly
                        className="font-mono"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(currentColor.hex, 'hex')}
                      >
                        {copied === 'hex' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>

                    {/* RGB */}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">RGB</Badge>
                      <Input
                        value={`rgb(${currentColor.rgb.r}, ${currentColor.rgb.g}, ${currentColor.rgb.b})`}
                        readOnly
                        className="font-mono"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(`rgb(${currentColor.rgb.r}, ${currentColor.rgb.g}, ${currentColor.rgb.b})`, 'rgb')}
                      >
                        {copied === 'rgb' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>

                    {/* HSL */}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">HSL</Badge>
                      <Input
                        value={`hsl(${currentColor.hsl.h}, ${currentColor.hsl.s}%, ${currentColor.hsl.l}%)`}
                        readOnly
                        className="font-mono"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(`hsl(${currentColor.hsl.h}, ${currentColor.hsl.s}%, ${currentColor.hsl.l}%)`, 'hsl')}
                      >
                        {copied === 'hsl' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 历史记录 */}
          {history.length > 0 && (
            <Card className="border-border/60 bg-card/85 shadow-sm">
              <CardHeader>
                <CardTitle>历史记录</CardTitle>
                <CardDescription>最近拾取的颜色</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
                  {history.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentColor(item.color)}
                      className="w-12 h-12 rounded-lg shadow-md border-2 border-border hover:border-primary transition-colors"
                      style={{ backgroundColor: item.color.hex }}
                      title={item.color.hex}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 使用说明 */}
          <Card className="border-border/60 bg-card/85 shadow-sm">
            <CardHeader>
              <CardTitle>使用说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>1. 点击"开始拾色"按钮，窗口会自动隐藏</p>
              <p>2. 将鼠标移动到屏幕上想要取色的位置</p>
              <p>3. 点击鼠标左键确认取色，窗口自动恢复</p>
              <p>4. 颜色会以多种格式显示，点击复制按钮即可复制</p>
              <p>5. 点击历史记录中的色块可以快速切换回该颜色</p>
            </CardContent>
          </Card>
    </PageSection>
  );
}
