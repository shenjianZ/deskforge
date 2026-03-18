import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

interface TreeLeafNode {
  type: 'leaf';
  label: string;
  value: string;
}

interface TreeBranchNode {
  type: 'branch';
  label: string;
  value?: string;
  children: TreeNode[];
}

type TreeNode = TreeLeafNode | TreeBranchNode;

function collectExpandablePaths(node: TreeNode, path = 'root'): string[] {
  if (node.type !== 'branch') {
    return [];
  }

  return [path, ...node.children.flatMap((child, index) => collectExpandablePaths(child, `${path}.${index}`))];
}

function TreeNodeItem({
  node,
  path,
  depth = 0,
  expandedPaths,
  onToggle,
}: {
  node: TreeNode;
  path: string;
  depth?: number;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
}) {
  const expandable = node.type === 'branch';
  const isExpanded = expandedPaths.has(path);

  return (
    <div>
      <div
        className="flex items-start gap-2 rounded-lg px-2 py-1 hover:bg-muted/50"
        style={{ paddingLeft: `${depth * 18 + 8}px` }}
      >
        {expandable ? (
          <button
            type="button"
            onClick={() => onToggle(path)}
            className="mt-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            {isExpanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="inline-block w-4" />
        )}
        <div className="min-w-0 flex-1 font-mono text-sm leading-6">
          <span className="text-violet-600 dark:text-violet-400">{node.label}</span>
          {node.value ? (
            <>
              <span className="text-muted-foreground">: </span>
              <span className="text-muted-foreground">{node.value}</span>
            </>
          ) : null}
        </div>
      </div>
      {expandable && isExpanded && (
        <div>
          {node.children.map((child, index) => (
            <TreeNodeItem
              key={`${path}.${index}`}
              node={child}
              path={`${path}.${index}`}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatAttributes(element: Element): string {
  if (element.attributes.length === 0) {
    return '';
  }

  return Array.from(element.attributes)
    .map((attribute) => `${attribute.name}="${attribute.value}"`)
    .join(' ');
}

function buildMarkupTree(node: Node): TreeNode | null {
  if (node.nodeType === Node.DOCUMENT_NODE) {
    const children = Array.from(node.childNodes)
      .map(buildMarkupTree)
      .filter((child): child is TreeNode => child !== null);

    return {
      type: 'branch',
      label: '#document',
      children,
    };
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    const children = Array.from(element.childNodes)
      .map(buildMarkupTree)
      .filter((child): child is TreeNode => child !== null);

    return {
      type: 'branch',
      label: `<${element.tagName.toLowerCase()}>`,
      value: formatAttributes(element),
      children,
    };
  }

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim();
    if (!text) {
      return null;
    }

    return {
      type: 'leaf',
      label: '#text',
      value: text,
    };
  }

  if (node.nodeType === Node.COMMENT_NODE) {
    return {
      type: 'leaf',
      label: '#comment',
      value: node.textContent?.trim() || '',
    };
  }

  return null;
}

function parseMarkupToTree(source: string, mode: 'html' | 'xml'): TreeNode | null {
  if (!source.trim()) {
    return null;
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(source, mode === 'html' ? 'text/html' : 'application/xml');

  if (mode === 'xml' && document.querySelector('parsererror')) {
    return null;
  }

  return buildMarkupTree(document);
}

export function StructuredTreeView({
  source,
  mode,
  emptyMessage,
}: {
  source: string;
  mode: 'html' | 'xml';
  emptyMessage: string;
}) {
  const tree = useMemo(() => parseMarkupToTree(source, mode), [mode, source]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['root']));

  useEffect(() => {
    setExpandedPaths(new Set(['root']));
  }, [source, mode]);

  const toggleNode = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (!tree) {
      return;
    }

    setExpandedPaths(new Set(collectExpandablePaths(tree)));
  }, [tree]);

  const collapseAll = useCallback(() => {
    setExpandedPaths(new Set(['root']));
  }, []);

  if (!tree) {
    return (
      <div className="flex h-52 items-center justify-center rounded-2xl border border-border bg-muted/20 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={expandAll}>
          全部展开
        </Button>
        <Button size="sm" variant="outline" onClick={collapseAll}>
          全部收起
        </Button>
      </div>
      <div className="max-h-[26rem] overflow-auto rounded-2xl border border-border bg-muted/20 py-2">
        <TreeNodeItem node={tree} path="root" expandedPaths={expandedPaths} onToggle={toggleNode} />
      </div>
    </div>
  );
}
