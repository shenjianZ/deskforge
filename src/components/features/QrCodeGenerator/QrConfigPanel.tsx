/**
 * 二维码配置面板
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQrStore } from '@/stores/qrcodeStore';
import type { QrConfig } from '@/types/qrcode';
import { ERROR_CORRECTION_OPTIONS, SIZE_PRESETS } from '@/types/qrcode';
import { Download, RotateCcw } from 'lucide-react';
import { StyleOptions } from './StyleOptions';
import { LogoUpload } from './LogoUpload';

interface QrConfigPanelProps {
  config: QrConfig;
  onConfigChange: (updates: Partial<QrConfig>) => void;
}

export function QrConfigPanel({ config, onConfigChange }: QrConfigPanelProps) {
  const { exportToFile, resetConfig, isGenerating } = useQrStore();

  const handleExport = async () => {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const outputPath = await save({
        title: '保存二维码',
        defaultPath: `qrcode-${Date.now()}.png`,
        filters: [
          {
            name: 'PNG 图片',
            extensions: ['png'],
          },
        ],
      });

      if (outputPath) {
        await exportToFile(outputPath);
      }
    } catch (err) {
      console.error('保存失败:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* 基本配置 */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="content">二维码内容</Label>
          <Input
            id="content"
            placeholder="输入网址、文本或其他内容"
            value={config.content}
            onChange={(e) => onConfigChange({ content: e.target.value })}
            className="font-mono text-sm"
          />
        </div>

        {/* 尺寸选择 */}
        <div className="space-y-2">
          <Label>尺寸</Label>
          <Tabs
            value={config.size.toString()}
            onValueChange={(value) => onConfigChange({ size: Number(value) })}
          >
            <TabsList className="grid w-full grid-cols-4">
              {SIZE_PRESETS.map((preset) => (
                <TabsTrigger key={preset.value} value={preset.value.toString()}>
                  {preset.label.split(' ')[0]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <p className="text-xs text-muted-foreground">
            当前: {config.size}px
          </p>
        </div>

        {/* 容错级别 */}
        <div className="space-y-2">
          <Label>容错级别</Label>
          <Tabs
            value={config.errorCorrection}
            onValueChange={(value) =>
              onConfigChange({ errorCorrection: value as QrConfig['errorCorrection'] })
            }
          >
            <TabsList className="grid w-full grid-cols-4">
              {ERROR_CORRECTION_OPTIONS.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.value}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <p className="text-xs text-muted-foreground">
            {ERROR_CORRECTION_OPTIONS.find((opt) => opt.value === config.errorCorrection)
              ?.description}
          </p>
        </div>

        {/* 边距 */}
        <div className="space-y-2">
          <Label htmlFor="margin">边距: {config.margin}</Label>
          <Input
            id="margin"
            type="range"
            min="0"
            max="20"
            value={config.margin}
            onChange={(e) => onConfigChange({ margin: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      </div>

      {/* 样式配置 */}
      <StyleOptions />

      {/* Logo 配置 */}
      <LogoUpload />

      {/* 操作按钮 */}
      <div className="flex gap-2 pt-2">
        <Button onClick={handleExport} disabled={isGenerating} className="flex-1">
          <Download className="w-4 h-4 mr-2" />
          导出 PNG
        </Button>
        <Button variant="outline" onClick={resetConfig}>
          <RotateCcw className="w-4 h-4 mr-2" />
          重置
        </Button>
      </div>
    </div>
  );
}
