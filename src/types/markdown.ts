export interface MarkdownPreviewStats {
  characterCount: number;
  lineCount: number;
  headingCount: number;
}

export interface ResolvedMarkdownAsset {
  originalPath: string;
  resolvedPath: string;
  dataUrl: string;
}

export const MARKDOWN_EXPORT_STYLE = `
  :root {
    color-scheme: light;
    --fg: #111827;
    --muted: #6b7280;
    --border: #d1d5db;
    --bg-soft: #f8fafc;
    --accent: #0369a1;
    --quote-bg: #fff7ed;
    --quote-border: #f59e0b;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 40px;
    font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    color: var(--fg);
    background: white;
  }
  .md-export {
    max-width: 920px;
    margin: 0 auto;
    line-height: 1.8;
    font-size: 15px;
  }
  .md-export h1, .md-export h2, .md-export h3, .md-export h4, .md-export h5, .md-export h6 {
    line-height: 1.35;
    margin: 1.5em 0 0.7em;
    font-weight: 700;
  }
  .md-export h1, .md-export h2 {
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.35em;
  }
  .md-export p, .md-export ul, .md-export ol, .md-export blockquote, .md-export pre, .md-export table {
    margin: 1em 0;
  }
  .md-export a {
    color: var(--accent);
    word-break: break-all;
  }
  .md-export blockquote {
    margin-left: 0;
    padding: 14px 18px;
    background: var(--quote-bg);
    border-left: 4px solid var(--quote-border);
    color: var(--muted);
    border-radius: 0 14px 14px 0;
  }
  .md-export code {
    padding: 0.12em 0.42em;
    border-radius: 6px;
    background: #f3f4f6;
    font-family: "Cascadia Code", "Consolas", monospace;
    color: #be123c;
  }
  .md-export pre {
    overflow: auto;
    border-radius: 14px;
    background: #111827;
    color: #f9fafb;
    padding: 16px;
  }
  .md-export pre code {
    padding: 0;
    background: transparent;
    color: inherit;
  }
  .md-export img {
    display: block;
    max-width: 100%;
    height: auto;
    border-radius: 16px;
    margin: 1.2em 0;
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  }
  .md-export table {
    width: 100%;
    border-collapse: collapse;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 14px;
  }
  .md-export th, .md-export td {
    border-bottom: 1px solid var(--border);
    padding: 10px 12px;
    text-align: left;
    vertical-align: top;
  }
  .md-export th {
    background: var(--bg-soft);
  }
  .md-export .md-footnotes {
    margin-top: 2.5em;
    padding-top: 1em;
    border-top: 1px solid var(--border);
  }
  .md-export .md-footnote-ref,
  .md-export .md-footnote-backref {
    text-decoration: none;
    font-weight: 600;
  }
  .md-export .md-mermaid-wrap {
    margin: 1.2em 0;
    border: 1px solid var(--border);
    border-radius: 18px;
    background: linear-gradient(180deg, #ffffff, #f8fafc);
    padding: 18px;
    overflow: auto;
  }
`;

export const MARKDOWN_PREVIEW_EXAMPLE = `# DeskForge Markdown 预览

> 适合快速检查 Markdown 文档的排版效果。

这是一个脚注示例[^intro]，下面还有 Mermaid、本地图片和网络图片的用法。

## 功能演示

- 支持常见 Markdown 语法
- 支持 GFM 表格和任务列表
- 支持代码块与引用
- 支持 Mermaid 图表
- 支持脚注与图片

### 任务列表

- [x] 标题与段落
- [x] 表格
- [x] 代码块
- [ ] 导出 HTML

### 表格

| 工具 | 状态 | 说明 |
| --- | --- | --- |
| Markdown 预览 | 已实现 | GFM 渲染 |
| 正则测试 | 已实现 | 匹配与替换 |

### 代码块

\`\`\`ts
const title = "DeskForge";
console.log(\`Hello, \${title}\`);
\`\`\`

### Mermaid

\`\`\`mermaid
flowchart LR
  A[Markdown] --> B[预览]
  B --> C[HTML 导出]
  B --> D[PDF 导出]
\`\`\`

### 图片

网络图片：

![DeskForge Cover](https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80)

本地图片：

![本地图](./assets/example.png)

### 链接

[项目首页](https://example.com)

[^intro]: 脚注当前通过 GFM 语法直接渲染。`;
