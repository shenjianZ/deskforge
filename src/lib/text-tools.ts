import type {
  FullHalfWidthMode,
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
  TextToolResult,
  TextTransformMode,
  TextTrimWhitespaceConfig,
} from '@/types/text-tools';

const NORMALIZED_NEWLINE = '\n';
const CHUNK_MARKER_PATTERN = /^---\s*chunk\s+\d+\s*---$/i;
const EXISTING_LINE_NUMBER_PATTERN = /^\s*\d+\s*(?:[.)、:：-]\s*|\s+)/;

function splitLines(text: string) {
  return text.split(/\r\n|\n|\r/);
}

function countLines(text: string) {
  return text.length === 0 ? 0 : splitLines(text).length;
}

function buildResult(input: string, output: string, extras?: { errorMessage?: string; chunks?: number }): TextToolResult {
  return {
    output,
    errorMessage: extras?.errorMessage,
    stats: {
      inputChars: input.length,
      outputChars: output.length,
      inputLines: countLines(input),
      outputLines: countLines(output),
      chunks: extras?.chunks,
    },
  };
}

function normalizeToLf(text: string) {
  return text.replace(/\r\n|\n|\r/g, NORMALIZED_NEWLINE);
}

function preserveTrailingNewline(input: string, output: string, newlineValue: string) {
  const hasTrailingNewline = /(?:\r\n|\n|\r)$/.test(input);
  return hasTrailingNewline && output ? `${output}${newlineValue}` : output;
}

function createCollator(config: TextSortConfig) {
  return new Intl.Collator('zh-CN', {
    numeric: config.method === 'natural',
    sensitivity: config.ignoreCase ? 'accent' : 'variant',
  });
}

function splitIntoChunks<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function splitIntoChunkCount<T>(items: T[], chunkCount: number) {
  const normalizedChunkCount = Math.max(1, Math.min(chunkCount, Math.max(items.length, 1)));
  const chunks: T[][] = [];
  let cursor = 0;

  for (let index = 0; index < normalizedChunkCount; index += 1) {
    const remainingItems = items.length - cursor;
    const remainingChunks = normalizedChunkCount - index;
    const currentSize = Math.ceil(remainingItems / remainingChunks);
    const chunk = items.slice(cursor, cursor + currentSize);
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    cursor += currentSize;
  }

  return chunks;
}

function formatChunks(chunks: string[][]) {
  return chunks
    .map((chunk, index) => [`--- chunk ${index + 1} ---`, chunk.join(NORMALIZED_NEWLINE)].join(NORMALIZED_NEWLINE))
    .join(`${NORMALIZED_NEWLINE}${NORMALIZED_NEWLINE}`);
}

function parseMergeSegments(input: string) {
  const normalized = normalizeToLf(input);
  const lines = normalized.split(NORMALIZED_NEWLINE);

  if (lines.some((line) => CHUNK_MARKER_PATTERN.test(line.trim()))) {
    const segments: string[] = [];
    let current: string[] = [];

    for (const line of lines) {
      if (CHUNK_MARKER_PATTERN.test(line.trim())) {
        if (current.length > 0) {
          segments.push(current.join(NORMALIZED_NEWLINE));
          current = [];
        }
        continue;
      }
      current.push(line);
    }

    if (current.length > 0) {
      segments.push(current.join(NORMALIZED_NEWLINE));
    }

    return segments.filter((segment) => segment.length > 0);
  }

  return normalized
    .split(/\n\s*\n+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

function applyLetterCase(text: string, mode: LetterCaseMode) {
  switch (mode) {
    case 'upper':
      return text.toUpperCase();
    case 'lower':
      return text.toLowerCase();
    case 'title':
      return text.replace(/[A-Za-z]+/g, (word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`);
    case 'sentence':
      return text
        .toLowerCase()
        .replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, (segment) => segment.toUpperCase());
    case 'invert':
      return Array.from(text)
        .map((char) => {
          const upper = char.toUpperCase();
          const lower = char.toLowerCase();
          if (char === upper && char !== lower) {
            return lower;
          }
          if (char === lower && char !== upper) {
            return upper;
          }
          return char;
        })
        .join('');
    default:
      return text;
  }
}

function tokenizeNamingInput(text: string) {
  return text
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/[_\-\s]+/g, ' ')
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => token.toLowerCase());
}

function applyNamingStyle(text: string, mode: NamingStyleMode) {
  const tokens = tokenizeNamingInput(text);
  if (tokens.length === 0) {
    return '';
  }

  switch (mode) {
    case 'camelCase':
      return tokens[0] + tokens.slice(1).map((token) => `${token.charAt(0).toUpperCase()}${token.slice(1)}`).join('');
    case 'pascalCase':
      return tokens.map((token) => `${token.charAt(0).toUpperCase()}${token.slice(1)}`).join('');
    case 'snake_case':
      return tokens.join('_');
    case 'kebab-case':
      return tokens.join('-');
    case 'SCREAMING_SNAKE_CASE':
      return tokens.join('_').toUpperCase();
    default:
      return text;
  }
}

function convertWidth(text: string, mode: FullHalfWidthMode) {
  return Array.from(text)
    .map((char) => {
      const code = char.charCodeAt(0);
      if (mode === 'fullToHalf') {
        if (code === 12288) {
          return ' ';
        }
        if (code >= 65281 && code <= 65374) {
          return String.fromCharCode(code - 65248);
        }
        return char;
      }

      if (code === 32) {
        return String.fromCharCode(12288);
      }
      if (code >= 33 && code <= 126) {
        return String.fromCharCode(code + 65248);
      }
      return char;
    })
    .join('');
}

function applyNewline(text: string, mode: NewlineMode) {
  const newlineValue = mode === 'crlf' ? '\r\n' : mode === 'cr' ? '\r' : '\n';
  if (text.length === 0) {
    return '';
  }

  const hadTrailingNewline = /(?:\r\n|\n|\r)$/.test(text);
  const normalized = normalizeToLf(text);
  const base = hadTrailingNewline ? normalized.slice(0, -1) : normalized;
  const output = base.split('\n').join(newlineValue);
  return preserveTrailingNewline(text, output, newlineValue);
}

export function processText(
  input: string,
  mode: TextProcessMode,
  config:
    | TextSortConfig
    | TextReplaceConfig
    | TextSplitConfig
    | TextMergeConfig
    | TextTrimWhitespaceConfig
    | TextLineNumbersConfig
) {
  switch (mode) {
    case 'dedupe': {
      const lines = splitLines(normalizeToLf(input));
      const seen = new Set<string>();
      const uniqueLines = lines.filter((line) => {
        if (seen.has(line)) {
          return false;
        }
        seen.add(line);
        return true;
      });
      return buildResult(input, uniqueLines.join(NORMALIZED_NEWLINE));
    }
    case 'sort': {
      const sortConfig = config as TextSortConfig;
      const lines = splitLines(normalizeToLf(input));
      const collator = createCollator(sortConfig);
      const sortedLines = [...lines].sort((left, right) => {
        const comparison = collator.compare(left, right);
        return sortConfig.direction === 'asc' ? comparison : comparison * -1;
      });
      return buildResult(input, sortedLines.join(NORMALIZED_NEWLINE));
    }
    case 'replace': {
      const replaceConfig = config as TextReplaceConfig;
      if (!replaceConfig.find) {
        return buildResult(input, input, { errorMessage: '查找内容不能为空' });
      }

      if (replaceConfig.useRegex) {
        try {
          const flags = `${replaceConfig.replaceAll ? 'g' : ''}${replaceConfig.ignoreCase ? 'i' : ''}`;
          const regex = new RegExp(replaceConfig.find, flags);
          return buildResult(input, input.replace(regex, replaceConfig.replaceWith));
        } catch (error) {
          return buildResult(input, input, {
            errorMessage: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (replaceConfig.replaceAll) {
        return buildResult(input, input.split(replaceConfig.find).join(replaceConfig.replaceWith));
      }

      return buildResult(input, input.replace(replaceConfig.find, replaceConfig.replaceWith));
    }
    case 'split': {
      const splitConfig = config as TextSplitConfig;
      if (!Number.isFinite(splitConfig.count) || splitConfig.count <= 0) {
        return buildResult(input, input, { errorMessage: '分割数量必须大于 0' });
      }

      const lines = splitLines(normalizeToLf(input));
      if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
        return buildResult(input, '');
      }

      const chunks =
        splitConfig.mode === 'byLinesPerChunk'
          ? splitIntoChunks(lines, Math.max(1, Math.floor(splitConfig.count)))
          : splitIntoChunkCount(lines, Math.max(1, Math.floor(splitConfig.count)));

      return buildResult(input, formatChunks(chunks), { chunks: chunks.length });
    }
    case 'merge': {
      const mergeConfig = config as TextMergeConfig;
      const segments = parseMergeSegments(input);
      const delimiter =
        mergeConfig.delimiterMode === 'none'
          ? ''
          : mergeConfig.delimiterMode === 'newline'
            ? NORMALIZED_NEWLINE
            : mergeConfig.customDelimiter;
      return buildResult(input, segments.join(delimiter), { chunks: segments.length });
    }
    case 'trimWhitespace': {
      const trimConfig = config as TextTrimWhitespaceConfig;
      let lines = splitLines(normalizeToLf(input)).map((line) => {
        let next = line;
        if (trimConfig.removeTrailingWhitespace) {
          next = next.replace(/[ \t\u3000]+$/g, '');
        }
        if (trimConfig.trimLineStartEnd) {
          next = next.trim();
        }
        return next;
      });

      if (trimConfig.removeEmptyLines) {
        lines = lines.filter((line) => line.trim().length > 0);
      } else if (trimConfig.collapseBlankLines) {
        const collapsed: string[] = [];
        let previousBlank = false;
        for (const line of lines) {
          const isBlank = line.trim().length === 0;
          if (isBlank && previousBlank) {
            continue;
          }
          collapsed.push(line);
          previousBlank = isBlank;
        }
        lines = collapsed;
      }

      return buildResult(input, lines.join(NORMALIZED_NEWLINE));
    }
    case 'lineNumbers': {
      const lineNumberConfig = config as TextLineNumbersConfig;
      const lines = splitLines(normalizeToLf(input));
      const sanitizedLines =
        lineNumberConfig.operation === 'remove' || lineNumberConfig.operation === 'renumber'
          ? lines.map((line) => line.replace(EXISTING_LINE_NUMBER_PATTERN, ''))
          : lines;

      if (lineNumberConfig.operation === 'remove') {
        return buildResult(input, sanitizedLines.join(NORMALIZED_NEWLINE));
      }

      const output = sanitizedLines
        .map((line, index) => `${lineNumberConfig.start + index * lineNumberConfig.step}${lineNumberConfig.separator}${line}`)
        .join(NORMALIZED_NEWLINE);

      return buildResult(input, output);
    }
    default:
      return buildResult(input, input);
  }
}

export function transformText(
  input: string,
  mode: TextTransformMode,
  config: TextLetterCaseConfig | TextNamingStyleConfig | TextFullHalfWidthConfig | TextNewlineConfig
) {
  switch (mode) {
    case 'letterCase':
      return buildResult(input, applyLetterCase(input, (config as TextLetterCaseConfig).mode));
    case 'namingStyle':
      return buildResult(input, applyNamingStyle(input, (config as TextNamingStyleConfig).mode));
    case 'fullHalfWidth':
      return buildResult(input, convertWidth(input, (config as TextFullHalfWidthConfig).mode));
    case 'newline':
      return buildResult(input, applyNewline(input, (config as TextNewlineConfig).mode));
    default:
      return buildResult(input, input);
  }
}
