import { invoke } from '@tauri-apps/api/core';
import type {
  ApiAuthConfig,
  ApiEnvironment,
  ApiKeyValueRow,
  ApiRawBodyType,
  ApiRequestDraft,
  ApiRequestMethod,
  ApiResponseSnapshot,
} from '@/types/api';

export const API_METHODS: ApiRequestMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export const RAW_BODY_TYPES: Array<{ value: ApiRawBodyType; label: string; contentType: string }> = [
  { value: 'json', label: 'JSON', contentType: 'application/json' },
  { value: 'text', label: 'Text', contentType: 'text/plain' },
  { value: 'xml', label: 'XML', contentType: 'application/xml' },
  { value: 'html', label: 'HTML', contentType: 'text/html' },
];

export type CurlTerminalFlavor = 'powershell' | 'bash' | 'cmd';

export function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createKeyValueRow(partial?: Partial<ApiKeyValueRow>): ApiKeyValueRow {
  return {
    id: createId('row'),
    key: '',
    value: '',
    enabled: true,
    ...partial,
  };
}

export function createEmptyRequestDraft(partial?: Partial<ApiRequestDraft>): ApiRequestDraft {
  return {
    name: '',
    method: 'GET',
    url: '',
    queryParams: [createKeyValueRow()],
    headers: [createKeyValueRow({ key: 'Accept', value: 'application/json' })],
    auth: { type: 'none' },
    bodyMode: 'none',
    rawBody: '',
    rawBodyType: 'json',
    formBody: [createKeyValueRow()],
    ...partial,
  };
}

export function cloneRequestDraft(request: ApiRequestDraft): ApiRequestDraft {
  return {
    ...request,
    queryParams: request.queryParams.map((row) => ({ ...row })),
    headers: request.headers.map((row) => ({ ...row })),
    formBody: request.formBody.map((row) => ({ ...row })),
    auth: { ...request.auth } as ApiAuthConfig,
  };
}

export function deriveRequestTitle(request: ApiRequestDraft) {
  if (request.name.trim()) {
    return request.name.trim();
  }

  if (request.url.trim()) {
    return request.url.trim().replace(/^https?:\/\//, '').slice(0, 36);
  }

  return `${request.method} 请求`;
}

export function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getEnvironmentVariables(environment?: ApiEnvironment | null) {
  if (!environment) {
    return {} as Record<string, string>;
  }

  return environment.variables.reduce<Record<string, string>>((record, row) => {
    if (row.enabled && row.key.trim()) {
      record[row.key.trim()] = row.value;
    }
    return record;
  }, {});
}

export function resolveTemplate(value: string, variables: Record<string, string>) {
  return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim();
    return Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : '';
  });
}

function encodeBasicAuth(username: string, password: string) {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function ensureHeader(headers: Headers, key: string, value: string) {
  if (!headers.has(key)) {
    headers.set(key, value);
  }
}

export function buildResolvedRequest(request: ApiRequestDraft, environment?: ApiEnvironment | null) {
  const variables = getEnvironmentVariables(environment);
  const resolvedBaseUrl = resolveTemplate(request.url.trim(), variables);

  if (!resolvedBaseUrl) {
    throw new Error('请输入请求 URL。');
  }

  let url: URL;
  try {
    url = new URL(resolvedBaseUrl);
  } catch {
    throw new Error('请求 URL 无效，请输入完整的 http:// 或 https:// 地址。');
  }

  request.queryParams.forEach((row) => {
    if (row.enabled && row.key.trim()) {
      url.searchParams.set(resolveTemplate(row.key.trim(), variables), resolveTemplate(row.value, variables));
    }
  });

  const headers = new Headers();
  request.headers.forEach((row) => {
    if (row.enabled && row.key.trim()) {
      headers.set(resolveTemplate(row.key.trim(), variables), resolveTemplate(row.value, variables));
    }
  });

  if (request.auth.type === 'bearer' && request.auth.token.trim()) {
    headers.set('Authorization', `Bearer ${resolveTemplate(request.auth.token, variables)}`);
  }

  if (request.auth.type === 'basic') {
    headers.set(
      'Authorization',
      `Basic ${encodeBasicAuth(resolveTemplate(request.auth.username, variables), resolveTemplate(request.auth.password, variables))}`
    );
  }

  if (request.auth.type === 'apiKey' && request.auth.key.trim()) {
    const key = resolveTemplate(request.auth.key.trim(), variables);
    const value = resolveTemplate(request.auth.value, variables);
    if (request.auth.placement === 'query') {
      url.searchParams.set(key, value);
    } else {
      headers.set(key, value);
    }
  }

  let body: string | undefined;

  if (request.bodyMode === 'raw') {
    body = resolveTemplate(request.rawBody, variables);
    const rawType = RAW_BODY_TYPES.find((item) => item.value === request.rawBodyType);
    if (rawType) {
      ensureHeader(headers, 'Content-Type', rawType.contentType);
    }
  }

  if (request.bodyMode === 'form') {
    const params = new URLSearchParams();
    request.formBody.forEach((row) => {
      if (row.enabled && row.key.trim()) {
        params.set(resolveTemplate(row.key.trim(), variables), resolveTemplate(row.value, variables));
      }
    });
    body = params.toString();
    ensureHeader(headers, 'Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
  }

  const curlParts = [
    `curl -X ${request.method}`,
    `"${url.toString()}"`,
    ...Array.from(headers.entries()).flatMap(([key, value]) => ['-H', `"${key}: ${value.replace(/"/g, '\\"')}"`]),
  ];

  if (body && !['GET', 'HEAD'].includes(request.method)) {
    curlParts.push('--data-raw', `"${body.replace(/"/g, '\\"')}"`);
  }

  return {
    method: request.method,
    url: url.toString(),
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : body,
    curl: curlParts.join(' '),
  };
}

function normalizeError(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return '请求超时。';
  }

  if (error instanceof Error) {
    return error.message || '请求失败。';
  }

  return '请求失败。';
}

export async function executeApiRequest(
  request: ApiRequestDraft,
  environment?: ApiEnvironment | null,
  timeoutMs = 15000
): Promise<ApiResponseSnapshot> {
  try {
    return await invoke<ApiResponseSnapshot>('execute_api_request', {
      request,
      environment,
      timeoutMs,
    });
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export function getPrettyResponseBody(response: ApiResponseSnapshot | null) {
  if (!response?.body) {
    return '';
  }

  const contentType = response.contentType.toLowerCase();
  if (contentType.includes('json')) {
    try {
      return JSON.stringify(JSON.parse(response.body), null, 2);
    } catch {
      return response.body;
    }
  }

  return response.body;
}

function escapeDoubleQuotes(value: string) {
  return value.replace(/"/g, '\\"');
}

function escapePowerShell(value: string) {
  return value.replace(/`/g, '``').replace(/"/g, '`"');
}

function escapeCmd(value: string) {
  return value.replace(/\^/g, '^^').replace(/"/g, '\\"');
}

export function formatCurlCommand(response: ApiResponseSnapshot, flavor: CurlTerminalFlavor) {
  const headerArgs = response.requestHeaders
    .filter((header) => header.key.trim())
    .map((header) => ({ key: header.key, value: header.value }));
  const hasBody = Boolean(response.requestBody) && !['GET', 'HEAD'].includes(response.requestMethod);
  const joinWithContinuation = (lines: string[], continuation: string) =>
    lines.map((line, index) => (index < lines.length - 1 ? `${line} ${continuation}` : line)).join('\n');

  if (flavor === 'bash') {
    const lines = [`curl -X ${response.requestMethod} "${escapeDoubleQuotes(response.resolvedUrl)}"`];

    headerArgs.forEach((header) => {
      lines.push(`  -H "${escapeDoubleQuotes(`${header.key}: ${header.value}`)}"`);
    });

    if (hasBody) {
      lines.push(`  --data-raw "${escapeDoubleQuotes(response.requestBody)}"`);
    }

    return joinWithContinuation(lines, '\\');
  }

  if (flavor === 'powershell') {
    const lines = ['curl.exe', `  -X ${response.requestMethod} "${escapePowerShell(response.resolvedUrl)}"`];

    headerArgs.forEach((header) => {
      lines.push(`  -H "${escapePowerShell(`${header.key}: ${header.value}`)}"`);
    });

    if (hasBody) {
      lines.push(`  --data-raw "${escapePowerShell(response.requestBody)}"`);
    }

    return joinWithContinuation(lines, '`');
  }

  const cmdLines = [`curl -X ${response.requestMethod} "${escapeCmd(response.resolvedUrl)}"`];

  headerArgs.forEach((header) => {
    cmdLines.push(`  -H "${escapeCmd(`${header.key}: ${header.value}`)}"`);
  });

  if (hasBody) {
    cmdLines.push(`  --data-raw "${escapeCmd(response.requestBody)}"`);
  }

  return joinWithContinuation(cmdLines, '^');
}
