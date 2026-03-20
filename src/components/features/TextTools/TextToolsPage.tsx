import { useCallback, useMemo, useState } from 'react';
import { FormatterWorkbench } from '@/components/features/FormatterWorkbench';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageSection } from '@/components/layout/PageSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { processText, transformText } from '@/lib/text-tools';
import { usePreferencesStore } from '@/stores/preferencesStore';
import type {
  LetterCaseMode,
  NamingStyleMode,
  NewlineMode,
  TextFullHalfWidthConfig,
  TextLetterCaseConfig,
  TextLineNumbersConfig,
  TextMergeConfig,
  TextNewlineConfig,
  TextNamingStyleConfig,
  TextProcessMode,
  TextReplaceConfig,
  TextSortConfig,
  TextSplitConfig,
  TextToolCategory,
  TextTransformMode,
  TextTrimWhitespaceConfig,
} from '@/types/text-tools';

const PROCESS_MODES: { value: TextProcessMode; label: string }[] = [
  { value: 'dedupe', label: '文本去重' },
  { value: 'sort', label: '文本排序' },
  { value: 'replace', label: '文本替换' },
  { value: 'split', label: '批量分割' },
  { value: 'merge', label: '批量合并' },
  { value: 'trimWhitespace', label: '空白清理' },
  { value: 'lineNumbers', label: '行号处理' },
];

const TRANSFORM_MODES: { value: TextTransformMode; label: string }[] = [
  { value: 'letterCase', label: '大小写转换' },
  { value: 'namingStyle', label: '命名风格转换' },
  { value: 'fullHalfWidth', label: '全角半角转换' },
  { value: 'newline', label: '换行符转换' },
];

const PROCESS_EXAMPLES: Record<TextProcessMode, string> = {
  dedupe: 'apple\nbanana\napple\norange\nbanana',
  sort: 'file10\nfile2\nFile1\nfile20',
  replace: 'DeskForge makes text handling faster.\nDeskForge helps with quick edits.',
  split: 'line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7',
  merge: '--- chunk 1 ---\nalpha\nbeta\n\n--- chunk 2 ---\ngamma\ndelta',
  trimWhitespace: '  alpha  \n\n   beta\t \n\t\n gamma   ',
  lineNumbers: 'first line\nsecond line\nthird line',
};

const TRANSFORM_EXAMPLES: Record<TextTransformMode, string> = {
  letterCase: 'deskForge text TOOL',
  namingStyle: 'user profile id',
  fullHalfWidth: 'Ｔｅｘｔ １２３，DeskForge！',
  newline: 'first line\r\nsecond line\nthird line\rfourth line',
};

const PROCESS_HELP: Record<TextProcessMode, React.ReactNode> = {
  dedupe: (
    <>
      <p>1. 按行去重，默认保留每个重复项第一次出现的位置。</p>
      <p>2. 适合清理白名单、域名列表、标签列表这类重复文本。</p>
      <p>3. 首版不做模糊去重，只有完全相同的行才会被视为重复。</p>
    </>
  ),
  sort: (
    <>
      <p>1. 支持字典序和自然排序，适合普通文本和带数字的文件名。</p>
      <p>2. 可切换升序 / 降序，并支持忽略大小写。</p>
      <p>3. 排序以整行作为单位，不会拆词重排。</p>
    </>
  ),
  replace: (
    <>
      <p>1. 默认按普通文本替换，也可以切换为正则替换。</p>
      <p>2. 正则模式支持全局替换与忽略大小写开关。</p>
      <p>3. 简单替换建议关闭正则，避免转义成本。</p>
    </>
  ),
  split: (
    <>
      <p>1. 支持“每 N 行一组”与“平均分成 N 组”两种分割方式。</p>
      <p>2. 输出会自动添加 chunk 标记，便于后续再次合并。</p>
      <p>3. 适合把超长列表拆分成多段发送或保存。</p>
    </>
  ),
  merge: (
    <>
      <p>1. 优先识别 `--- chunk n ---` 形式的段落标记，再回退到空行分段。</p>
      <p>2. 合并时可选择无分隔、换行或自定义分隔符。</p>
      <p>3. 适合把拆开的多段文本重新拼成一段。</p>
    </>
  ),
  trimWhitespace: (
    <>
      <p>1. 支持清理行首行尾空白、行尾多余空格、空行和连续空白行。</p>
      <p>2. 适合整理复制自文档、表格或终端输出的文本。</p>
      <p>3. “删除空行”和“压缩连续空行”同时开启时，以删除空行为准。</p>
    </>
  ),
  lineNumbers: (
    <>
      <p>1. 支持添加行号、移除已有行号和重编号。</p>
      <p>2. 重编号会先尝试剥离已有前缀，再按新的起始值和步长生成。</p>
      <p>3. 常见的 `1. `、`1: `、`1 - ` 等前缀都可识别。</p>
    </>
  ),
};

const TRANSFORM_HELP: Record<TextTransformMode, React.ReactNode> = {
  letterCase: (
    <>
      <p>1. 支持全大写、全小写、标题式、句首大写和大小写反转。</p>
      <p>2. 英文字母会参与转换，中文等非字母字符保持原样。</p>
      <p>3. 适合快速统一标题、变量说明或英文片段风格。</p>
    </>
  ),
  namingStyle: (
    <>
      <p>1. 面向变量名、字段名、短标题等标识符场景。</p>
      <p>2. 支持 camelCase、PascalCase、snake_case、kebab-case 和全大写下划线。</p>
      <p>3. 会尝试识别空格、短横线、下划线和大小写边界作为词元。</p>
    </>
  ),
  fullHalfWidth: (
    <>
      <p>1. 支持全角转半角、半角转全角双向转换。</p>
      <p>2. 字母、数字、常见英文标点和空格会按对应编码范围处理。</p>
      <p>3. 适合处理中英文混排、表单输入和历史系统数据。</p>
    </>
  ),
  newline: (
    <>
      <p>1. 支持统一转为 LF、CRLF、CR 三种换行风格。</p>
      <p>2. 适合跨 Windows / Unix / 旧系统场景同步文本格式。</p>
      <p>3. 输入里存在混合换行时，会先标准化再输出到目标格式。</p>
    </>
  ),
};

function getProcessDescription(mode: TextProcessMode) {
  switch (mode) {
    case 'dedupe':
      return '按行去重，保留首次出现的顺序。';
    case 'sort':
      return '按整行排序，支持字典序和自然排序。';
    case 'replace':
      return '普通替换与正则替换统一入口。';
    case 'split':
      return '把多行文本拆成多个 chunk，便于分发。';
    case 'merge':
      return '把多个文本段重新拼接成一段。';
    case 'trimWhitespace':
      return '清理多余空白、空行和行尾空格。';
    case 'lineNumbers':
      return '添加、移除或重编行号。';
  }
}

function getTransformDescription(mode: TextTransformMode) {
  switch (mode) {
    case 'letterCase':
      return '统一处理英文大小写风格。';
    case 'namingStyle':
      return '在常见命名风格之间快速切换。';
    case 'fullHalfWidth':
      return '处理中英文宽字符与半角字符。';
    case 'newline':
      return '统一文本换行格式。';
  }
}

function CategorySwitch({
  category,
  setCategory,
}: {
  category: TextToolCategory;
  setCategory: (category: TextToolCategory) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant={category === 'process' ? 'default' : 'outline'} onClick={() => setCategory('process')}>
        文本处理
      </Button>
      <Button size="sm" variant={category === 'transform' ? 'default' : 'outline'} onClick={() => setCategory('transform')}>
        文本转换
      </Button>
    </div>
  );
}

export function TextToolsPage() {
  const { autoCollapseInput, wrapLongLines } = usePreferencesStore();
  const [category, setCategory] = useState<TextToolCategory>('process');
  const [processMode, setProcessMode] = useState<TextProcessMode>('dedupe');
  const [transformMode, setTransformMode] = useState<TextTransformMode>('letterCase');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);
  const [stats, setStats] = useState<{
    inputChars: number;
    outputChars: number;
    inputLines: number;
    outputLines: number;
    chunks?: number;
  } | null>(null);

  const [sortConfig, setSortConfig] = useState<TextSortConfig>({
    method: 'lexicographic',
    direction: 'asc',
    ignoreCase: false,
  });
  const [replaceConfig, setReplaceConfig] = useState<TextReplaceConfig>({
    find: 'DeskForge',
    replaceWith: 'DeskForge Pro',
    useRegex: false,
    replaceAll: true,
    ignoreCase: false,
  });
  const [splitConfig, setSplitConfig] = useState<TextSplitConfig>({
    mode: 'byLinesPerChunk',
    count: 3,
  });
  const [mergeConfig, setMergeConfig] = useState<TextMergeConfig>({
    delimiterMode: 'newline',
    customDelimiter: ', ',
  });
  const [trimConfig, setTrimConfig] = useState<TextTrimWhitespaceConfig>({
    trimLineStartEnd: true,
    removeTrailingWhitespace: true,
    removeEmptyLines: false,
    collapseBlankLines: true,
  });
  const [lineNumberConfig, setLineNumberConfig] = useState<TextLineNumbersConfig>({
    operation: 'add',
    start: 1,
    step: 1,
    separator: '. ',
  });
  const [letterCaseConfig, setLetterCaseConfig] = useState<TextLetterCaseConfig>({ mode: 'title' });
  const [namingStyleConfig, setNamingStyleConfig] = useState<TextNamingStyleConfig>({ mode: 'camelCase' });
  const [fullHalfWidthConfig, setFullHalfWidthConfig] = useState<TextFullHalfWidthConfig>({ mode: 'fullToHalf' });
  const [newlineConfig, setNewlineConfig] = useState<TextNewlineConfig>({ mode: 'lf' });

  const validation = errorMessage
    ? {
        isValid: false,
        errorMessage,
      }
    : null;

  const activeTitle = category === 'process'
    ? PROCESS_MODES.find((item) => item.value === processMode)?.label ?? '文本处理'
    : TRANSFORM_MODES.find((item) => item.value === transformMode)?.label ?? '文本转换';

  const outputDescription = useMemo(() => {
    if (category === 'process') {
      return stats?.chunks ? `已生成 ${stats.chunks} 个文本片段，结果区可直接复制。` : getProcessDescription(processMode);
    }
    return getTransformDescription(transformMode);
  }, [category, processMode, stats?.chunks, transformMode]);

  const outputToolbar = stats ? (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>输入 {stats.inputChars} 字符</span>
      <span>输出 {stats.outputChars} 字符</span>
      {typeof stats.chunks === 'number' ? <span>{stats.chunks} 段</span> : null}
    </div>
  ) : null;

  const execute = useCallback(() => {
    setIsProcessing(true);
    try {
      const result =
        category === 'process'
          ? (() => {
              switch (processMode) {
                case 'dedupe':
                  return processText(input, processMode, sortConfig);
                case 'sort':
                  return processText(input, processMode, sortConfig);
                case 'replace':
                  return processText(input, processMode, replaceConfig);
                case 'split':
                  return processText(input, processMode, splitConfig);
                case 'merge':
                  return processText(input, processMode, mergeConfig);
                case 'trimWhitespace':
                  return processText(input, processMode, trimConfig);
                case 'lineNumbers':
                  return processText(input, processMode, lineNumberConfig);
              }
            })()
          : (() => {
              switch (transformMode) {
                case 'letterCase':
                  return transformText(input, transformMode, letterCaseConfig);
                case 'namingStyle':
                  return transformText(input, transformMode, namingStyleConfig);
                case 'fullHalfWidth':
                  return transformText(input, transformMode, fullHalfWidthConfig);
                case 'newline':
                  return transformText(input, transformMode, newlineConfig);
              }
            })();

      setOutput(result.output);
      setErrorMessage(result.errorMessage);
      setStats(result.stats);
      if (!result.errorMessage && autoCollapseInput) {
        setIsInputCollapsed(true);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [
    autoCollapseInput,
    category,
    fullHalfWidthConfig,
    input,
    letterCaseConfig,
    lineNumberConfig,
    mergeConfig,
    namingStyleConfig,
    newlineConfig,
    processMode,
    replaceConfig,
    sortConfig,
    splitConfig,
    transformMode,
    trimConfig,
  ]);

  const clearAll = useCallback(() => {
    setInput('');
    setOutput('');
    setErrorMessage(undefined);
    setStats(null);
  }, []);

  const loadExample = useCallback(() => {
    const nextInput = category === 'process' ? PROCESS_EXAMPLES[processMode] : TRANSFORM_EXAMPLES[transformMode];
    setInput(nextInput);
    setOutput('');
    setErrorMessage(undefined);
    setStats(null);
  }, [category, processMode, transformMode]);

  const configPanel = category === 'process' ? (
    <div className="space-y-5">
      <CategorySwitch category={category} setCategory={setCategory} />

      <div className="flex flex-wrap gap-2">
        {PROCESS_MODES.map((item) => (
          <Button key={item.value} size="sm" variant={processMode === item.value ? 'default' : 'outline'} onClick={() => setProcessMode(item.value)}>
            {item.label}
          </Button>
        ))}
      </div>

      {processMode === 'sort' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">排序方式</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={sortConfig.method === 'lexicographic' ? 'default' : 'outline'} onClick={() => setSortConfig((prev) => ({ ...prev, method: 'lexicographic' }))}>
                字典序
              </Button>
              <Button size="sm" variant={sortConfig.method === 'natural' ? 'default' : 'outline'} onClick={() => setSortConfig((prev) => ({ ...prev, method: 'natural' }))}>
                自然排序
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">方向</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={sortConfig.direction === 'asc' ? 'default' : 'outline'} onClick={() => setSortConfig((prev) => ({ ...prev, direction: 'asc' }))}>
                升序
              </Button>
              <Button size="sm" variant={sortConfig.direction === 'desc' ? 'default' : 'outline'} onClick={() => setSortConfig((prev) => ({ ...prev, direction: 'desc' }))}>
                降序
              </Button>
              <Button size="sm" variant={sortConfig.ignoreCase ? 'default' : 'outline'} onClick={() => setSortConfig((prev) => ({ ...prev, ignoreCase: !prev.ignoreCase }))}>
                {sortConfig.ignoreCase ? '忽略大小写' : '区分大小写'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {processMode === 'replace' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="text-tools-find">查找</Label>
            <Input id="text-tools-find" value={replaceConfig.find} onChange={(event) => setReplaceConfig((prev) => ({ ...prev, find: event.target.value }))} placeholder="输入待查找内容" className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="text-tools-replace">替换为</Label>
            <Input id="text-tools-replace" value={replaceConfig.replaceWith} onChange={(event) => setReplaceConfig((prev) => ({ ...prev, replaceWith: event.target.value }))} placeholder="输入替换文本" className="font-mono" />
          </div>
          <div className="xl:col-span-2 flex flex-wrap items-center gap-2">
            <Button size="sm" variant={replaceConfig.useRegex ? 'default' : 'outline'} onClick={() => setReplaceConfig((prev) => ({ ...prev, useRegex: !prev.useRegex }))}>
              {replaceConfig.useRegex ? '正则模式' : '普通模式'}
            </Button>
            <Button size="sm" variant={replaceConfig.replaceAll ? 'default' : 'outline'} onClick={() => setReplaceConfig((prev) => ({ ...prev, replaceAll: !prev.replaceAll }))}>
              {replaceConfig.replaceAll ? '全局替换' : '替换首个'}
            </Button>
            <Button size="sm" variant={replaceConfig.ignoreCase ? 'default' : 'outline'} onClick={() => setReplaceConfig((prev) => ({ ...prev, ignoreCase: !prev.ignoreCase }))}>
              {replaceConfig.ignoreCase ? '忽略大小写' : '区分大小写'}
            </Button>
          </div>
        </div>
      ) : null}

      {processMode === 'split' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">分割方式</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={splitConfig.mode === 'byLinesPerChunk' ? 'default' : 'outline'} onClick={() => setSplitConfig((prev) => ({ ...prev, mode: 'byLinesPerChunk' }))}>
                每 N 行一组
              </Button>
              <Button size="sm" variant={splitConfig.mode === 'byChunkCount' ? 'default' : 'outline'} onClick={() => setSplitConfig((prev) => ({ ...prev, mode: 'byChunkCount' }))}>
                平均分组
              </Button>
            </div>
          </div>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="text-tools-split-count">{splitConfig.mode === 'byLinesPerChunk' ? '每组行数' : '组数'}</Label>
            <Input id="text-tools-split-count" type="number" min={1} value={String(splitConfig.count)} onChange={(event) => setSplitConfig((prev) => ({ ...prev, count: Number(event.target.value) || 0 }))} />
          </div>
        </div>
      ) : null}

      {processMode === 'merge' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">分隔符</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={mergeConfig.delimiterMode === 'none' ? 'default' : 'outline'} onClick={() => setMergeConfig((prev) => ({ ...prev, delimiterMode: 'none' }))}>
                无
              </Button>
              <Button size="sm" variant={mergeConfig.delimiterMode === 'newline' ? 'default' : 'outline'} onClick={() => setMergeConfig((prev) => ({ ...prev, delimiterMode: 'newline' }))}>
                换行
              </Button>
              <Button size="sm" variant={mergeConfig.delimiterMode === 'custom' ? 'default' : 'outline'} onClick={() => setMergeConfig((prev) => ({ ...prev, delimiterMode: 'custom' }))}>
                自定义
              </Button>
            </div>
          </div>
          {mergeConfig.delimiterMode === 'custom' ? (
            <div className="max-w-xl space-y-2">
              <Label htmlFor="text-tools-merge-delimiter">自定义分隔符</Label>
              <Input id="text-tools-merge-delimiter" value={mergeConfig.customDelimiter} onChange={(event) => setMergeConfig((prev) => ({ ...prev, customDelimiter: event.target.value }))} placeholder="例如: , " className="font-mono" />
            </div>
          ) : null}
        </div>
      ) : null}

      {processMode === 'trimWhitespace' ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={trimConfig.trimLineStartEnd ? 'default' : 'outline'} onClick={() => setTrimConfig((prev) => ({ ...prev, trimLineStartEnd: !prev.trimLineStartEnd }))}>
            行首尾 Trim
          </Button>
          <Button size="sm" variant={trimConfig.removeTrailingWhitespace ? 'default' : 'outline'} onClick={() => setTrimConfig((prev) => ({ ...prev, removeTrailingWhitespace: !prev.removeTrailingWhitespace }))}>
            清理行尾空格
          </Button>
          <Button size="sm" variant={trimConfig.removeEmptyLines ? 'default' : 'outline'} onClick={() => setTrimConfig((prev) => ({ ...prev, removeEmptyLines: !prev.removeEmptyLines }))}>
            删除空行
          </Button>
          <Button size="sm" variant={trimConfig.collapseBlankLines ? 'default' : 'outline'} onClick={() => setTrimConfig((prev) => ({ ...prev, collapseBlankLines: !prev.collapseBlankLines }))}>
            压缩连续空行
          </Button>
        </div>
      ) : null}

      {processMode === 'lineNumbers' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">操作</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={lineNumberConfig.operation === 'add' ? 'default' : 'outline'} onClick={() => setLineNumberConfig((prev) => ({ ...prev, operation: 'add' }))}>
                添加
              </Button>
              <Button size="sm" variant={lineNumberConfig.operation === 'remove' ? 'default' : 'outline'} onClick={() => setLineNumberConfig((prev) => ({ ...prev, operation: 'remove' }))}>
                移除
              </Button>
              <Button size="sm" variant={lineNumberConfig.operation === 'renumber' ? 'default' : 'outline'} onClick={() => setLineNumberConfig((prev) => ({ ...prev, operation: 'renumber' }))}>
                重编号
              </Button>
            </div>
          </div>
          {lineNumberConfig.operation !== 'remove' ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="text-tools-line-start">起始值</Label>
                <Input id="text-tools-line-start" type="number" value={String(lineNumberConfig.start)} onChange={(event) => setLineNumberConfig((prev) => ({ ...prev, start: Number(event.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="text-tools-line-step">步长</Label>
                <Input id="text-tools-line-step" type="number" value={String(lineNumberConfig.step)} onChange={(event) => setLineNumberConfig((prev) => ({ ...prev, step: Number(event.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="text-tools-line-separator">分隔符</Label>
                <Input id="text-tools-line-separator" value={lineNumberConfig.separator} onChange={(event) => setLineNumberConfig((prev) => ({ ...prev, separator: event.target.value }))} className="font-mono" />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  ) : (
    <div className="space-y-5">
      <CategorySwitch category={category} setCategory={setCategory} />

      <div className="flex flex-wrap gap-2">
        {TRANSFORM_MODES.map((item) => (
          <Button key={item.value} size="sm" variant={transformMode === item.value ? 'default' : 'outline'} onClick={() => setTransformMode(item.value)}>
            {item.label}
          </Button>
        ))}
      </div>

      {transformMode === 'letterCase' ? (
        <div className="flex flex-wrap gap-2">
          {([
            ['upper', '全大写'],
            ['lower', '全小写'],
            ['title', '标题式'],
            ['sentence', '句首大写'],
            ['invert', '大小写反转'],
          ] as [LetterCaseMode, string][]).map(([value, label]) => (
            <Button key={value} size="sm" variant={letterCaseConfig.mode === value ? 'default' : 'outline'} onClick={() => setLetterCaseConfig({ mode: value })}>
              {label}
            </Button>
          ))}
        </div>
      ) : null}

      {transformMode === 'namingStyle' ? (
        <div className="flex flex-wrap gap-2">
          {([
            ['camelCase', 'camelCase'],
            ['pascalCase', 'PascalCase'],
            ['snake_case', 'snake_case'],
            ['kebab-case', 'kebab-case'],
            ['SCREAMING_SNAKE_CASE', 'SCREAMING_SNAKE'],
          ] as [NamingStyleMode, string][]).map(([value, label]) => (
            <Button key={value} size="sm" variant={namingStyleConfig.mode === value ? 'default' : 'outline'} onClick={() => setNamingStyleConfig({ mode: value })}>
              {label}
            </Button>
          ))}
        </div>
      ) : null}

      {transformMode === 'fullHalfWidth' ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={fullHalfWidthConfig.mode === 'fullToHalf' ? 'default' : 'outline'} onClick={() => setFullHalfWidthConfig({ mode: 'fullToHalf' })}>
            全角转半角
          </Button>
          <Button size="sm" variant={fullHalfWidthConfig.mode === 'halfToFull' ? 'default' : 'outline'} onClick={() => setFullHalfWidthConfig({ mode: 'halfToFull' })}>
            半角转全角
          </Button>
        </div>
      ) : null}

      {transformMode === 'newline' ? (
        <div className="flex flex-wrap gap-2">
          {([
            ['lf', 'LF'],
            ['crlf', 'CRLF'],
            ['cr', 'CR'],
          ] as [NewlineMode, string][]).map(([value, label]) => (
            <Button key={value} size="sm" variant={newlineConfig.mode === value ? 'default' : 'outline'} onClick={() => setNewlineConfig({ mode: value })}>
              {label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );

  const helpContent = category === 'process' ? PROCESS_HELP[processMode] : TRANSFORM_HELP[transformMode];
  const inputDescription = category === 'process' ? getProcessDescription(processMode) : getTransformDescription(transformMode);

  return (
    <PageSection className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader title="文本工具" description="统一处理逐行清洗、替换、分割合并和常见文本转换，适合日常开发与文案整理。" backTo="/" />
        <FormatterWorkbench
          inputLabel={`输入${activeTitle}`}
          inputDescription={inputDescription}
          outputLanguage="text"
          outputDescription={outputDescription}
          input={input}
          onInputChange={setInput}
          output={output}
          validation={validation}
          isProcessing={isProcessing}
          isInputCollapsed={isInputCollapsed}
          onInputCollapseChange={setIsInputCollapsed}
          onPrimaryAction={execute}
          primaryActionLabel={category === 'process' ? '执行处理' : '执行转换'}
          onClear={clearAll}
          onLoadExample={loadExample}
          outputToolbar={outputToolbar}
          wrapLongLines={wrapLongLines}
          configPanel={configPanel}
          helpContent={helpContent}
        />
      </div>
    </PageSection>
  );
}
