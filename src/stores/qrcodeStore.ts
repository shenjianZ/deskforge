/**
 * 二维码生成器状态管理
 */

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { QrConfig, QrStyle, LogoConfig, QrResult } from '@/types/qrcode';
import { DEFAULT_QR_CONFIG } from '@/types/qrcode';

interface QrState {
  /** 当前配置 */
  config: QrConfig;
  /** 预览图片 URL */
  previewUrl: string;
  /** 是否正在生成 */
  isGenerating: boolean;
  /** 错误信息 */
  error: string | null;
  /** 更新配置 */
  updateConfig: (updates: Partial<QrConfig>) => void;
  /** 更新样式 */
  updateStyle: (updates: Partial<QrStyle>) => void;
  /** 更新 Logo 配置 */
  updateLogo: (updates: Partial<LogoConfig>) => void;
  /** 清除 Logo */
  clearLogo: () => void;
  /** 选择 Logo 文件 */
  selectLogoFile: () => Promise<void>;
  /** 重置配置 */
  resetConfig: () => void;
  /** 生成预览 */
  generatePreview: () => Promise<void>;
  /** 导出到文件 */
  exportToFile: (outputPath: string) => Promise<void>;
  /** 清除错误 */
  clearError: () => void;
}

export const useQrStore = create<QrState>((set, get) => ({
  config: DEFAULT_QR_CONFIG,
  previewUrl: '',
  isGenerating: false,
  error: null,

  updateConfig: (updates) => {
    set((state) => ({
      config: { ...state.config, ...updates },
    }));
  },

  updateStyle: (updates) => {
    set((state) => ({
      config: {
        ...state.config,
        style: { ...state.config.style, ...updates },
      },
    }));
  },

  updateLogo: (updates) => {
    set((state) => {
      const currentLogo = state.config.logo;
      return {
        config: {
          ...state.config,
          logo: { ...currentLogo, ...updates } as LogoConfig,
        },
      };
    });
  },

  clearLogo: () => {
    set((state) => ({
      config: {
        ...state.config,
        logo: undefined,
      },
    }));
  },

  selectLogoFile: async () => {
    try {
      const selected = await open({
        title: '选择 Logo 图片',
        filters: [
          {
            name: '图片',
            extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'],
          },
        ],
      });

      if (selected && typeof selected === 'string') {
        // 初始化 Logo 配置
        set((state) => ({
          config: {
            ...state.config,
            logo: {
              path: selected,
              scale: 0.2,
              hasBorder: true,
              borderWidth: 4,
            },
          },
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      set({ error: `选择 Logo 失败: ${errorMessage}` });
    }
  },

  resetConfig: () => {
    set({
      config: DEFAULT_QR_CONFIG,
      previewUrl: '',
      error: null,
    });
  },

  generatePreview: async () => {
    const { config } = get();

    // 验证内容
    if (!config.content.trim()) {
      set({ error: '二维码内容不能为空' });
      return;
    }

    set({ isGenerating: true, error: null });

    try {
      const result = (await invoke('generate_qr_preview', {
        config,
      })) as QrResult;

      set({ previewUrl: result.data, error: null });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      set({ error: `生成失败: ${errorMessage}` });
    } finally {
      set({ isGenerating: false });
    }
  },

  exportToFile: async (outputPath) => {
    const { config } = get();

    if (!config.content.trim()) {
      set({ error: '二维码内容不能为空' });
      return;
    }

    set({ isGenerating: true, error: null });

    try {
      await invoke('generate_qr_file', {
        config,
        outputPath,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      set({ error: `导出失败: ${errorMessage}` });
      throw err;
    } finally {
      set({ isGenerating: false });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
