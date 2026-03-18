/**
 * 二维码生成器主页面
 */

import { useEffect } from 'react';
import { useDebounce } from '@uidotdev/usehooks';
import { useQrStore } from '@/stores/qrcodeStore';
import { QrConfigPanel } from './QrConfigPanel';
import { QrPreview } from './QrPreview';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageSection } from '@/components/layout/PageSection';

export function QrCodeGeneratorPage() {
  const { config, updateConfig, generatePreview } = useQrStore();

  // 防抖配置（300ms）
  const debouncedConfig = useDebounce(config, 300);

  // 当配置改变时自动生成预览
  useEffect(() => {
    if (debouncedConfig.content.trim()) {
      generatePreview();
    }
  }, [debouncedConfig, generatePreview]);

  return (
    <PageSection className="space-y-6">
      <PageHeader title="二维码生成器" backTo="/" />
      <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧配置面板 */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <QrConfigPanel
                config={config}
                onConfigChange={updateConfig}
              />
            </div>
          </div>

          {/* 右侧预览区域 */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-center min-h-[500px] bg-muted/20 rounded-lg border-2 border-dashed border-border">
              <QrPreview />
            </div>
          </div>
        </div>
      </div>
    </PageSection>
  );
}
