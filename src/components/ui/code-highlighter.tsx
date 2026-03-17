import { memo, useEffect, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';
import { getHighlightLanguage, getLanguageDisplayName } from '@/lib/syntax-helpers';
import { Copy, Check, Code2 } from 'lucide-react';
import { Button } from './button';

export interface CodeHighlighterProps {
  /** 要高亮的代码内容 */
  code: string;
  /** 编程语言 */
  language: string;
  /** 自定义类名 */
  className?: string;
  /** 是否显示行号，默认 true */
  showLineNumbers?: boolean;
  /** 是否换行显示长行，默认 false（横向滚动） */
  wrapLongLines?: boolean;
  /** 最大高度 */
  maxHeight?: string;
  /** 是否显示复制按钮，默认 true */
  showCopyButton?: boolean;
  /** 是否显示语言标签，默认 true */
  showLanguageLabel?: boolean;
}

/**
 * 代码高亮组件
 *
 * 使用 react-syntax-highlighter 实现代码语法高亮，支持：
 * - 自动检测系统主题（明暗模式）
 * - 行号显示
 * - 横向滚动或自动换行
 * - 复制代码功能
 * - 语言标签显示
 */
const CodeHighlighterComponent = ({
  code,
  language,
  className,
  showLineNumbers = true,
  wrapLongLines = false,
  maxHeight,
  showCopyButton = true,
  showLanguageLabel = true,
}: CodeHighlighterProps) => {
  const [copied, setCopied] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // 检测系统主题
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(darkModeQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    darkModeQuery.addEventListener('change', handleChange);
    return () => darkModeQuery.removeEventListener('change', handleChange);
  }, []);

  // 复制代码到剪贴板
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const highlightLanguage = getHighlightLanguage(language);
  const languageDisplay = getLanguageDisplayName(language);
  const theme = isDark ? vscDarkPlus : vs;

  if (!code) {
    return (
      <div
        className={cn(
          'flex items-center justify-center text-muted-foreground font-mono text-sm bg-muted rounded-lg',
          className
        )}
        style={{ maxHeight }}
      >
        代码将显示在这里...
      </div>
    );
  }

  return (
    <div className={cn('relative group', className)}>
      {/* 顶部工具栏 */}
      {(showLanguageLabel || showCopyButton) && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b rounded-t-lg">
          {showLanguageLabel && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Code2 className="w-4 h-4" />
              <span>{languageDisplay}</span>
            </div>
          )}
          {showCopyButton && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-7 px-2 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  复制
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* 代码高亮区域 */}
      <div
        className="rounded-b-lg overflow-auto"
        style={{
          maxHeight: maxHeight ? `calc(${maxHeight} - ${showLanguageLabel || showCopyButton ? '40px' : '0px'})` : undefined,
        }}
      >
        <SyntaxHighlighter
          language={highlightLanguage}
          style={theme}
          showLineNumbers={showLineNumbers}
          wrapLongLines={wrapLongLines}
          customStyle={{
            margin: 0,
            borderRadius: '0 0 0.5rem 0.5rem',
            background: 'transparent',
            fontSize: '0.875rem',
          }}
          lineNumberStyle={{
            color: isDark ? '#8b949e' : '#6e7681',
            fontSize: '0.875rem',
            paddingRight: '1rem',
            minWidth: '2.5rem',
            textAlign: 'right',
          }}
          className="font-mono"
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

/**
 * 导出经过 memo 优化的组件
 */
export const CodeHighlighter = memo(CodeHighlighterComponent);
