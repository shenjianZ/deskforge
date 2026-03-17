import type { SearchResult } from './CommandPalette';
import { AppWindow } from 'lucide-react';

interface ResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  onClick: () => void;
}

export function ResultItem({ result, isSelected, onClick }: ResultItemProps) {
  const IconComponent = AppWindow; // 默认图标

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-primary/20 border-l-4 border-primary'
          : 'hover:bg-muted/50 border-l-4 border-transparent'
      }`}
    >
      {/* 图标 */}
      <div className="flex-shrink-0">
        <IconComponent className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{result.title}</div>
        {result.description && (
          <div className="text-sm text-muted-foreground truncate">
            {result.description}
          </div>
        )}
      </div>

      {/* 快捷键提示（可选） */}
      {result.icon && (
        <div className="flex-shrink-0 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          {result.icon}
        </div>
      )}
    </div>
  );
}
