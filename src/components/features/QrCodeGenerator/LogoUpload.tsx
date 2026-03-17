/**
 * Logo 上传组件
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQrStore } from '@/stores/qrcodeStore';
import { Image as ImageIcon, Upload, X } from 'lucide-react';

export function LogoUpload() {
  const { config, selectLogoFile, clearLogo, updateLogo } = useQrStore();
  const logo = config.logo;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="w-4 h-4" />
          Logo 配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!logo ? (
          // 未选择 Logo 时显示上传按钮
          <Button
            variant="outline"
            className="w-full"
            onClick={selectLogoFile}
          >
            <Upload className="w-4 h-4 mr-2" />
            选择 Logo 图片
          </Button>
        ) : (
          // 已选择 Logo 时显示配置
          <div className="space-y-4">
            {/* 文件名 */}
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <ImageIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate">
                  {logo.path.split(/[/\\]/).pop()}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={clearLogo}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Logo 缩放比例 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">缩放比例: {(logo.scale * 100).toFixed(0)}%</Label>
              </div>
              <Input
                type="range"
                min="5"
                max="30"
                value={logo.scale * 100}
                onChange={(e) =>
                  updateLogo({ scale: Number(e.target.value) / 100 })
                }
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                建议 10%-20%，过大可能影响扫码
              </p>
            </div>

            {/* 边框选项 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="logo-border"
                  checked={logo.hasBorder}
                  onChange={(e) =>
                    updateLogo({ hasBorder: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="logo-border" className="text-xs cursor-pointer">
                  添加白色边框
                </Label>
              </div>
            </div>

            {/* 边框宽度 */}
            {logo.hasBorder && (
              <div className="space-y-2">
                <Label className="text-xs">边框宽度: {logo.borderWidth}px</Label>
                <Input
                  type="range"
                  min="1"
                  max="20"
                  value={logo.borderWidth}
                  onChange={(e) =>
                    updateLogo({ borderWidth: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
