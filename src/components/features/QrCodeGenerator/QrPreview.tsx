/**
 * 二维码预览组件
 */

import { Card } from '@/components/ui/card';
import { useQrStore } from '@/stores/qrcodeStore';
import { Loader2 } from 'lucide-react';

export function QrPreview() {
  const { previewUrl, isGenerating, error, config } = useQrStore();

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 预览卡片 */}
      <Card className="p-4 shadow-lg">
        {isGenerating ? (
          <div className="flex items-center justify-center w-[300px] h-[300px]">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt="二维码预览"
            className="w-[300px] h-[300px] object-contain"
          />
        ) : (
          <div className="flex items-center justify-center w-[300px] h-[300px] text-muted-foreground">
            <p className="text-sm">输入内容后自动生成预览</p>
          </div>
        )}
      </Card>

      {/* 错误提示 */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-md">
          {error}
        </div>
      )}

      {/* 配置信息 */}
      {previewUrl && !error && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>尺寸: {config.size}px</p>
          <p>容错级别: {config.errorCorrection}</p>
          <p>边距: {config.margin}</p>
        </div>
      )}
    </div>
  );
}
