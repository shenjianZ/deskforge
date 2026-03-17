/**
 * 样式配置组件
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQrStore } from '@/stores/qrcodeStore';
import {
  DOT_SHAPE_OPTIONS,
  EYE_SHAPE_OPTIONS,
  COLOR_PRESETS,
  type QrStyle,
} from '@/types/qrcode';
import { Palette, Sparkles, Trash2 } from 'lucide-react';

export function StyleOptions() {
  const { config, updateStyle } = useQrStore();
  const style = config.style!;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="w-4 h-4" />
          样式配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 点形状 */}
        <div className="space-y-2">
          <Label>点形状</Label>
          <Tabs
            value={style.dotShape}
            onValueChange={(value) => updateStyle({ dotShape: value as QrStyle['dotShape'] })}
          >
            <TabsList className="grid w-full grid-cols-3">
              {DOT_SHAPE_OPTIONS.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  <span className="mr-1">{option.icon}</span>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* 码眼形状 */}
        <div className="space-y-2">
          <Label>码眼形状</Label>
          <Tabs
            value={style.eyeShape}
            onValueChange={(value) => updateStyle({ eyeShape: value as QrStyle['eyeShape'] })}
          >
            <TabsList className="grid w-full grid-cols-3">
              {EYE_SHAPE_OPTIONS.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  <span className="mr-1">{option.icon}</span>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* 颜色配置 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>颜色</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() =>
                updateStyle({
                  foregroundColor: '#000000',
                  backgroundColor: '#FFFFFF',
                  isGradient: false,
                  gradientColors: undefined,
                })
              }
            >
              <Trash2 className="w-3 h-3 mr-1" />
              重置
            </Button>
          </div>

          {/* 预设颜色 */}
          <div className="grid grid-cols-3 gap-2">
            {COLOR_PRESETS.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() =>
                  updateStyle({
                    foregroundColor: preset.foreground,
                    backgroundColor: preset.background,
                  })
                }
              >
                <div className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: preset.foreground }}
                  />
                  <div
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: preset.background }}
                  />
                  <span>{preset.name}</span>
                </div>
              </Button>
            ))}
          </div>

          {/* 自定义颜色 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">前景色</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={style.foregroundColor}
                  onChange={(e) =>
                    updateStyle({ foregroundColor: e.target.value })
                  }
                  className="w-12 h-8 p-0 border-0"
                />
                <Input
                  type="text"
                  value={style.foregroundColor}
                  onChange={(e) =>
                    updateStyle({ foregroundColor: e.target.value })
                  }
                  className="flex-1 font-mono text-xs"
                  placeholder="#000000"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">背景色</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={style.backgroundColor}
                  onChange={(e) =>
                    updateStyle({ backgroundColor: e.target.value })
                  }
                  className="w-12 h-8 p-0 border-0"
                />
                <Input
                  type="text"
                  value={style.backgroundColor}
                  onChange={(e) =>
                    updateStyle({ backgroundColor: e.target.value })
                  }
                  className="flex-1 font-mono text-xs"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
          </div>

          {/* 渐变选项 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="gradient"
                checked={style.isGradient}
                onChange={(e) => updateStyle({ isGradient: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="gradient" className="text-xs cursor-pointer">
                启用渐变
              </Label>
            </div>
            <Sparkles className="w-4 h-4 text-muted-foreground" />
          </div>

          {style.isGradient && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">渐变起始色</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={
                      style.gradientColors?.[0] || style.foregroundColor
                    }
                    onChange={(e) =>
                      updateStyle({
                        gradientColors: [
                          e.target.value,
                          style.gradientColors?.[1] || style.foregroundColor,
                        ],
                      })
                    }
                    className="w-12 h-8 p-0 border-0"
                  />
                  <Input
                    type="text"
                    value={
                      style.gradientColors?.[0] || style.foregroundColor
                    }
                    onChange={(e) =>
                      updateStyle({
                        gradientColors: [
                          e.target.value,
                          style.gradientColors?.[1] || style.foregroundColor,
                        ],
                      })
                    }
                    className="flex-1 font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">渐变结束色</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={
                      style.gradientColors?.[1] || style.foregroundColor
                    }
                    onChange={(e) =>
                      updateStyle({
                        gradientColors: [
                          style.gradientColors?.[0] ||
                            style.foregroundColor,
                          e.target.value,
                        ],
                      })
                    }
                    className="w-12 h-8 p-0 border-0"
                  />
                  <Input
                    type="text"
                    value={
                      style.gradientColors?.[1] || style.foregroundColor
                    }
                    onChange={(e) =>
                      updateStyle({
                        gradientColors: [
                          style.gradientColors?.[0] ||
                            style.foregroundColor,
                          e.target.value,
                        ],
                      })
                    }
                    className="flex-1 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
