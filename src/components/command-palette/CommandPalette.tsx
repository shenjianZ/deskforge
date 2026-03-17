import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

/**
 * 全局快捷键处理组件
 * 负责监听全局快捷键并控制窗口显示/隐藏
 */
export function CommandPalette() {
  useEffect(() => {
    // 监听热键事件
    const unlistenPromise = listen('hotkey-pressed', async () => {
      await invoke('toggle_window');
    });

    // 清理监听器
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // 这个组件不渲染任何可见 UI
  return null;
}

// 保留 SearchResult 类型以供其他组件使用
export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  icon?: string;
}
