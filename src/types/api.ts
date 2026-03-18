export type ApiRequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type ApiKeyValuePlacement = 'header' | 'query';

export type ApiAuthType = 'none' | 'bearer' | 'basic' | 'apiKey';

export type ApiBodyMode = 'none' | 'raw' | 'form';

export type ApiRawBodyType = 'json' | 'text' | 'xml' | 'html';

export interface ApiKeyValueRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export type ApiAuthConfig =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string }
  | { type: 'apiKey'; key: string; value: string; placement: ApiKeyValuePlacement };

export interface ApiRequestDraft {
  name: string;
  method: ApiRequestMethod;
  url: string;
  queryParams: ApiKeyValueRow[];
  headers: ApiKeyValueRow[];
  auth: ApiAuthConfig;
  bodyMode: ApiBodyMode;
  rawBody: string;
  rawBodyType: ApiRawBodyType;
  formBody: ApiKeyValueRow[];
}

export interface ApiResponseSnapshot {
  ok: boolean;
  status: number;
  statusText: string;
  durationMs: number;
  sizeBytes: number;
  requestMethod: ApiRequestMethod;
  requestHeaders: ApiKeyValueRow[];
  requestBody: string;
  headers: ApiKeyValueRow[];
  body: string;
  contentType: string;
  resolvedUrl: string;
  curl: string;
  sentAt: string;
}

export interface ApiWorkspaceTab {
  id: string;
  title: string;
  request: ApiRequestDraft;
  response: ApiResponseSnapshot | null;
  error: string | null;
  sourceKey?: string;
  updatedAt: string;
}

export interface ApiSavedRequest {
  id: string;
  title: string;
  request: ApiRequestDraft;
  updatedAt: string;
  parentFolderId: string | null;
}

export interface ApiSavedRequestItem extends ApiSavedRequest {
  responseSummary?: {
    status: number;
    durationMs: number;
  };
}

export interface ApiFolder {
  id: string;
  name: string;
  parentFolderId: string | null;
  updatedAt: string;
}

export type ApiSaveDestination = { type: 'root' } | { type: 'folder'; folderId: string };

export interface ApiEnvironment {
  id: string;
  name: string;
  variables: ApiKeyValueRow[];
  updatedAt: string;
}
