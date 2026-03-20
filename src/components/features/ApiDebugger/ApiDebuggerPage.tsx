import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeHighlighter } from '@/components/ui/code-highlighter';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageSection } from '@/components/layout/PageSection';
import {
  interactiveSelectedClassName,
  interactiveSelectedMutedTextClassName,
} from '@/lib/themeClasses';
import {
  API_METHODS,
  createKeyValueRow,
  executeApiRequest,
  formatBytes,
  formatCurlCommand,
  getPrettyResponseBody,
  RAW_BODY_TYPES,
} from '@/lib/api-debugger';
import { useApiDebuggerStore } from '@/stores/apiDebuggerStore';
import type { ApiAuthType, ApiBodyMode, ApiFolder, ApiKeyValueRow, ApiRawBodyType, ApiSaveDestination, ApiSavedRequestItem } from '@/types/api';
import { ChevronDown, ChevronRight, Copy, FileText, Folder, FolderOpen, Globe, Plus, Send, Trash2, X } from 'lucide-react';

type ResourceSelection = { type: 'root' } | { type: 'folder'; folderId: string } | { type: 'request'; requestId: string };

function KeyValueEditor({
  rows,
  onChange,
  onAdd,
  onRemove,
  keyPlaceholder,
  valuePlaceholder,
}: {
  rows: ApiKeyValueRow[];
  onChange: (rowId: string, field: keyof ApiKeyValueRow, value: string | boolean) => void;
  onAdd: () => void;
  onRemove: (rowId: string) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
}) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="grid gap-3 rounded-[1.25rem] border border-border/60 bg-background/60 p-3 md:grid-cols-[92px_minmax(0,1fr)_minmax(0,1fr)_44px]">
          <Button type="button" variant={row.enabled ? 'default' : 'outline'} className="h-10 rounded-xl" onClick={() => onChange(row.id, 'enabled', !row.enabled)}>
            {row.enabled ? '已启用' : '未启用'}
          </Button>
          <Input value={row.key} onChange={(event) => onChange(row.id, 'key', event.target.value)} placeholder={keyPlaceholder} className="h-10 rounded-xl border-border/60" />
          <Input value={row.value} onChange={(event) => onChange(row.id, 'value', event.target.value)} placeholder={valuePlaceholder} className="h-10 rounded-xl border-border/60" />
          <Button type="button" variant="ghost" className="h-10 rounded-xl" onClick={() => onRemove(row.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" className="rounded-xl" onClick={onAdd}>
        <Plus className="mr-2 h-4 w-4" />
        新增一行
      </Button>
    </div>
  );
}

function ResourceCard({ title, icon, action, children }: { title: string; icon: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="border-border/60 bg-card/80 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">{icon}</div>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function TreeNodeButton({
  active,
  depth,
  icon,
  label,
  meta,
  onClick,
  onContextMenu,
  action,
}: {
  active: boolean;
  depth?: number;
  icon: ReactNode;
  label: string;
  meta?: string;
  onClick: () => void;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
  action?: ReactNode;
}) {
  return (
    <div
      className={`group flex items-center gap-2 rounded-xl border px-2 py-2 transition ${
        active ? interactiveSelectedClassName : 'border-transparent bg-background/50 hover:border-border/60 hover:bg-accent/70'
      }`}
      style={{ paddingLeft: `${8 + (depth ?? 0) * 18}px` }}
      onContextMenu={onContextMenu}
    >
      <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={onClick}>
        <span className={active ? interactiveSelectedMutedTextClassName : 'text-muted-foreground'}>{icon}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
        {meta ? <span className={`flex-shrink-0 text-[11px] ${active ? interactiveSelectedMutedTextClassName : 'text-muted-foreground'}`}>{meta}</span> : null}
      </button>
      {action}
    </div>
  );
}

function buildAuthConfig(type: ApiAuthType) {
  switch (type) {
    case 'bearer':
      return { type: 'bearer', token: '' } as const;
    case 'basic':
      return { type: 'basic', username: '', password: '' } as const;
    case 'apiKey':
      return { type: 'apiKey', key: '', value: '', placement: 'header' } as const;
    default:
      return { type: 'none' } as const;
  }
}

function parseSourceKey(sourceKey?: string): ResourceSelection | null {
  if (!sourceKey) {
    return null;
  }
  if (sourceKey.startsWith('root:')) {
    return { type: 'request', requestId: sourceKey.slice('root:'.length) };
  }
  if (sourceKey.startsWith('folder:')) {
    const [, , requestId] = sourceKey.split(':');
    return requestId ? { type: 'request', requestId } : null;
  }
  return null;
}

function getChildFolders(folders: ApiFolder[], parentFolderId: string | null) {
  return folders.filter((folder) => folder.parentFolderId === parentFolderId);
}

function getFolderRequests(savedRequests: ApiSavedRequestItem[], folderId: string | null) {
  return savedRequests.filter((request) => request.parentFolderId === folderId);
}

export function ApiDebuggerPage() {
  const {
    tabs,
    currentTabId,
    savedRequests,
    folders,
    environments,
    currentEnvironmentId,
    createTab,
    selectTab,
    closeTab,
    updateCurrentTabRequest,
    setCurrentTabResponse,
    saveCurrentRequest,
    openSavedRequest,
    renameSavedRequest,
    removeSavedRequest,
    moveSavedRequest,
    createFolder,
    renameFolder,
    deleteFolder,
    createEnvironment,
    setCurrentEnvironment,
    renameEnvironment,
    addEnvironmentVariable,
    updateEnvironmentVariable,
    removeEnvironmentVariable,
  } = useApiDebuggerStore();

  const [requestPanelTab, setRequestPanelTab] = useState('query');
  const [responsePanelTab, setResponsePanelTab] = useState('pretty');
  const [isSending, setIsSending] = useState(false);
  const [resourceSelection, setResourceSelection] = useState<ResourceSelection>({ type: 'root' });
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; target: ResourceSelection } | null>(null);

  const currentTab = tabs.find((tab) => tab.id === currentTabId) ?? tabs[0];
  const currentEnvironment = environments.find((environment) => environment.id === currentEnvironmentId) ?? environments[0] ?? null;
  const response = currentTab?.response ?? null;
  const prettyResponseBody = useMemo(() => getPrettyResponseBody(response), [response]);
  const contextTarget = contextMenu?.target ?? null;
  const contextFolder =
    contextTarget && contextTarget.type === 'folder' ? folders.find((folder) => folder.id === contextTarget.folderId) ?? null : null;
  const contextRequest =
    contextTarget && contextTarget.type === 'request' ? savedRequests.find((request) => request.id === contextTarget.requestId) ?? null : null;
  useEffect(() => {
    if (resourceSelection.type === 'folder' && !folders.some((folder) => folder.id === resourceSelection.folderId)) {
      setResourceSelection({ type: 'root' });
    }
    if (resourceSelection.type === 'request' && !savedRequests.some((request) => request.id === resourceSelection.requestId)) {
      setResourceSelection({ type: 'root' });
    }
  }, [folders, resourceSelection, savedRequests]);

  useEffect(() => {
    if (!currentTab) {
      return;
    }
    const linkedSelection = parseSourceKey(currentTab.sourceKey);
    if (linkedSelection?.type === 'request') {
      const linkedRequest = savedRequests.find((request) => request.id === linkedSelection.requestId);
      if (linkedRequest) {
        if (linkedRequest.parentFolderId) {
          setExpandedFolderIds((prev) => Array.from(new Set([...prev, linkedRequest.parentFolderId!])));
        }
        setResourceSelection(linkedSelection);
      }
    }
  }, [currentTab, folders, savedRequests]);

  const updateRowList = (field: 'queryParams' | 'headers' | 'formBody', rowId: string, changedField: keyof ApiKeyValueRow, value: string | boolean) => {
    updateCurrentTabRequest((request) => ({
      ...request,
      [field]: request[field].map((row) => (row.id === rowId ? { ...row, [changedField]: value } : row)),
    }));
  };

  const addRow = (field: 'queryParams' | 'headers' | 'formBody') => {
    updateCurrentTabRequest((request) => ({
      ...request,
      [field]: [...request[field], createKeyValueRow()],
    }));
  };

  const removeRow = (field: 'queryParams' | 'headers' | 'formBody', rowId: string) => {
    updateCurrentTabRequest((request) => {
      const nextRows = request[field].filter((row) => row.id !== rowId);
      return { ...request, [field]: nextRows.length > 0 ? nextRows : [createKeyValueRow()] };
    });
  };

  const handleSend = async () => {
    const latestState = useApiDebuggerStore.getState();
    const latestTab = latestState.tabs.find((tab) => tab.id === latestState.currentTabId);
    const latestEnvironment = latestState.environments.find((environment) => environment.id === latestState.currentEnvironmentId) ?? latestState.environments[0] ?? null;
    if (!latestTab) {
      return;
    }
    setIsSending(true);
    setCurrentTabResponse(null, null);
    try {
      const nextResponse = await executeApiRequest(latestTab.request, latestEnvironment, 15000);
      setCurrentTabResponse(nextResponse, null);
      setResponsePanelTab('pretty');
    } catch (error) {
      setCurrentTabResponse(null, error instanceof Error ? error.message : '请求失败。');
      setResponsePanelTab('pretty');
    } finally {
      setIsSending(false);
    }
  };

  const copyResponseBody = async () => {
    if (response?.body) {
      await navigator.clipboard.writeText(response.body);
    }
  };

  const copyCurl = async (flavor: 'powershell' | 'bash' | 'cmd') => {
    if (response) {
      await navigator.clipboard.writeText(formatCurlCommand(response, flavor));
    }
  };

  const toggleFolderExpanded = (folderId: string) => {
    setExpandedFolderIds((prev) => (prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]));
  };

  const handleCreateFolder = (parentFolderId: string | null) => {
    const folderId = createFolder(parentFolderId);
    setExpandedFolderIds((prev) => Array.from(new Set([...prev, folderId, ...(parentFolderId ? [parentFolderId] : [])])));
    setResourceSelection({ type: 'folder', folderId });
  };

  const handleSaveCurrent = (destination: ApiSaveDestination) => {
    saveCurrentRequest(destination);
  };

  const openContextMenu = (target: ResourceSelection, event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setResourceSelection(target);
    setContextMenu({ x: event.clientX, y: event.clientY, target });
  };

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const close = () => setContextMenu(null);
    window.addEventListener('mousedown', close);
    return () => {
      window.removeEventListener('mousedown', close);
    };
  }, [contextMenu]);

  const renderFolderTree = (parentFolderId: string | null, depth = 0): ReactNode =>
    getChildFolders(folders, parentFolderId).map((folder) => {
      const expanded = expandedFolderIds.includes(folder.id);
      const directRequests = getFolderRequests(savedRequests, folder.id);
      return (
        <div key={folder.id} className="space-y-1">
          <TreeNodeButton
            active={resourceSelection.type === 'folder' && resourceSelection.folderId === folder.id}
            depth={depth}
            icon={expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            label={folder.name}
            meta={`${directRequests.length}`}
            onClick={() => {
              setResourceSelection({ type: 'folder', folderId: folder.id });
              toggleFolderExpanded(folder.id);
            }}
            onContextMenu={(event) => openContextMenu({ type: 'folder', folderId: folder.id }, event)}
            action={
              <button type="button" className="rounded-md p-1 text-muted-foreground hover:bg-muted/70" onClick={(event) => { event.stopPropagation(); toggleFolderExpanded(folder.id); }}>
                {expanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
              </button>
            }
          />
          {expanded ? (
            <>
              {renderFolderTree(folder.id, depth + 1)}
              {directRequests.map((request) => (
                <TreeNodeButton
                  key={request.id}
                  active={resourceSelection.type === 'request' && resourceSelection.requestId === request.id}
                  depth={depth + 1}
                  icon={<FileText className="h-4 w-4" />}
                  label={request.title}
                  meta={request.request.method}
                  onClick={() => {
                    setResourceSelection({ type: 'request', requestId: request.id });
                    openSavedRequest(request.id);
                  }}
                  onContextMenu={(event) => openContextMenu({ type: 'request', requestId: request.id }, event)}
                />
              ))}
            </>
          ) : null}
        </div>
      );
    });

  if (!currentTab) {
    return null;
  }

  return (
    <PageSection className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="API / 网络调试工具"
          backTo="/"
          actions={
            <>
              <Button variant="outline" className="rounded-xl" onClick={() => createTab()}>
                <Plus className="mr-2 h-4 w-4" />
                新建请求
              </Button>
              <Button className="rounded-xl" onClick={handleSend} disabled={isSending}>
                <Send className="mr-2 h-4 w-4" />
                {isSending ? '发送中...' : '发送请求'}
              </Button>
            </>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-6">
            <ResourceCard
              title="资源管理"
              icon={<FolderOpen className="h-5 w-5" />}
            >
              <div className="space-y-4">
                <div className="rounded-[1.25rem] border border-border/60 bg-background/60 p-3">
                  <div className="mb-3 text-sm font-medium">资源树</div>
                  <div className="space-y-1">
                    <TreeNodeButton
                      active={resourceSelection.type === 'root'}
                      icon={<Folder className="h-4 w-4" />}
                      label="根目录"
                      meta={`${getFolderRequests(savedRequests, null).length}`}
                      onClick={() => setResourceSelection({ type: 'root' })}
                      onContextMenu={(event) => openContextMenu({ type: 'root' }, event)}
                    />
                    {renderFolderTree(null, 1)}
                    {getFolderRequests(savedRequests, null).map((request) => (
                      <TreeNodeButton
                        key={request.id}
                        active={resourceSelection.type === 'request' && resourceSelection.requestId === request.id}
                        depth={1}
                        icon={<FileText className="h-4 w-4" />}
                        label={request.title}
                        meta={request.request.method}
                        onClick={() => {
                          setResourceSelection({ type: 'request', requestId: request.id });
                          openSavedRequest(request.id);
                        }}
                        onContextMenu={(event) => openContextMenu({ type: 'request', requestId: request.id }, event)}
                      />
                    ))}
                  </div>
                </div>
                {contextMenu ? (
                  <div
                    className="fixed z-50 w-48 rounded-xl border border-border/70 bg-popover p-1 shadow-xl"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onMouseDown={(event) => event.stopPropagation()}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                  >
                    {contextMenu.target.type === 'root' ? (
                      <>
                        <button
                          type="button"
                          className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            handleCreateFolder(null);
                            setContextMenu(null);
                          }}
                        >
                          新建文件夹
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            handleSaveCurrent({ type: 'root' });
                            setContextMenu(null);
                          }}
                        >
                          保存当前请求到根目录
                        </button>
                      </>
                    ) : null}
                    {contextMenu.target.type === 'folder' && contextFolder ? (
                      <>
                        <button
                          type="button"
                          className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            handleCreateFolder(contextFolder.id);
                            setContextMenu(null);
                          }}
                        >
                          新建子文件夹
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            const nextName = window.prompt('文件夹名称', contextFolder.name);
                            if (nextName?.trim()) {
                              renameFolder(contextFolder.id, nextName.trim());
                            }
                            setContextMenu(null);
                          }}
                        >
                          重命名文件夹
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            handleSaveCurrent({ type: 'folder', folderId: contextFolder.id });
                            setContextMenu(null);
                          }}
                        >
                          保存当前请求到此文件夹
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
                          onClick={() => {
                            deleteFolder(contextFolder.id);
                            setResourceSelection({ type: 'root' });
                            setContextMenu(null);
                          }}
                        >
                          删除文件夹
                        </button>
                      </>
                    ) : null}
                    {contextMenu.target.type === 'request' && contextRequest ? (
                      <>
                        <button
                          type="button"
                          className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            openSavedRequest(contextRequest.id);
                            setContextMenu(null);
                          }}
                        >
                          打开到工作台
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            const nextName = window.prompt('接口名称', contextRequest.title);
                            if (nextName?.trim()) {
                              renameSavedRequest(contextRequest.id, nextName.trim());
                            }
                            setContextMenu(null);
                          }}
                        >
                          重命名接口
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            const target = window.prompt('移动到文件夹 ID，留空表示根目录', contextRequest.parentFolderId ?? '');
                            if (target !== null) {
                              moveSavedRequest(contextRequest.id, target.trim() ? { type: 'folder', folderId: target.trim() } : { type: 'root' });
                            }
                            setContextMenu(null);
                          }}
                        >
                          移动接口
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
                          onClick={() => {
                            removeSavedRequest(contextRequest.id);
                            setResourceSelection({ type: 'root' });
                            setContextMenu(null);
                          }}
                        >
                          删除接口
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </ResourceCard>

            <ResourceCard
              title="环境变量"
              icon={<Globe className="h-5 w-5" />}
              action={
                <Button variant="ghost" className="rounded-xl px-3" onClick={createEnvironment}>
                  <Plus className="h-4 w-4" />
                </Button>
              }
            >
              {currentEnvironment ? (
                <div className="space-y-4">
                  <select
                    value={currentEnvironment.id}
                    onChange={(event) => setCurrentEnvironment(event.target.value)}
                    className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm"
                  >
                    {environments.map((environment) => (
                      <option key={environment.id} value={environment.id}>
                        {environment.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={currentEnvironment.name}
                    onChange={(event) => renameEnvironment(currentEnvironment.id, event.target.value)}
                    className="h-11 rounded-xl border-border/60"
                    placeholder="环境名称"
                  />
                  <KeyValueEditor
                    rows={currentEnvironment.variables}
                    onChange={(rowId, field, value) => updateEnvironmentVariable(currentEnvironment.id, rowId, field, value)}
                    onAdd={() => addEnvironmentVariable(currentEnvironment.id)}
                    onRemove={(rowId) => removeEnvironmentVariable(currentEnvironment.id, rowId)}
                    keyPlaceholder="变量名"
                    valuePlaceholder="变量值"
                  />
                </div>
              ) : null}
            </ResourceCard>
          </div>
          <div className="space-y-6">
            <div className="rounded-[1.25rem] border border-border/60 bg-card/80 p-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                {tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition ${
                      tab.id === currentTabId
                        ? interactiveSelectedClassName
                        : 'border-border/60 bg-background/70'
                    }`}
                  >
                    <button type="button" className="max-w-[180px] truncate text-sm font-medium" onClick={() => selectTab(tab.id)}>
                      {tab.title}
                    </button>
                    <Button type="button" variant="ghost" className="h-7 rounded-lg px-1.5" onClick={() => closeTab(tab.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" className="rounded-xl" onClick={() => createTab()}>
                  <Plus className="mr-2 h-4 w-4" />
                  新建请求
                </Button>
              </div>
            </div>

            <Card className="border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Input
                    value={currentTab.request.name}
                    onChange={(event) =>
                      updateCurrentTabRequest((request) => ({
                        ...request,
                        name: event.target.value,
                      }))
                    }
                    placeholder="请求名称，可选"
                    className="h-11 max-w-xs rounded-xl border-border/60"
                  />
                  {currentTab.sourceKey ? <Badge variant="outline">已关联已保存资源</Badge> : <Badge variant="outline">未保存</Badge>}
                </div>
                <div className="grid gap-3 lg:grid-cols-[132px_minmax(0,1fr)_160px]">
                  <select
                    value={currentTab.request.method}
                    onChange={(event) =>
                      updateCurrentTabRequest((request) => ({
                        ...request,
                        method: event.target.value as typeof request.method,
                      }))
                    }
                    className="h-12 rounded-xl border border-border/60 bg-background px-3 text-sm font-medium"
                  >
                    {API_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={currentTab.request.url}
                    onChange={(event) =>
                      updateCurrentTabRequest((request) => ({
                        ...request,
                        url: event.target.value,
                      }))
                    }
                    placeholder="https://api.example.com/v1/users"
                    className="h-12 rounded-xl border-border/60"
                  />
                  <Button className="h-12 rounded-xl" onClick={handleSend} disabled={isSending}>
                    <Send className="mr-2 h-4 w-4" />
                    {isSending ? '发送中...' : '发送'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={requestPanelTab} onValueChange={setRequestPanelTab}>
                  <TabsList className="flex w-full flex-wrap justify-start gap-2 rounded-2xl bg-muted/40 p-2">
                    <TabsTrigger value="query">Query</TabsTrigger>
                    <TabsTrigger value="headers">Headers</TabsTrigger>
                    <TabsTrigger value="auth">Auth</TabsTrigger>
                    <TabsTrigger value="body">Body</TabsTrigger>
                  </TabsList>

                  <TabsContent value="query" className="mt-5">
                    <KeyValueEditor
                      rows={currentTab.request.queryParams}
                      onChange={(rowId, field, value) => updateRowList('queryParams', rowId, field, value)}
                      onAdd={() => addRow('queryParams')}
                      onRemove={(rowId) => removeRow('queryParams', rowId)}
                      keyPlaceholder="参数名"
                      valuePlaceholder="参数值"
                    />
                  </TabsContent>

                  <TabsContent value="headers" className="mt-5">
                    <KeyValueEditor
                      rows={currentTab.request.headers}
                      onChange={(rowId, field, value) => updateRowList('headers', rowId, field, value)}
                      onAdd={() => addRow('headers')}
                      onRemove={(rowId) => removeRow('headers', rowId)}
                      keyPlaceholder="Header"
                      valuePlaceholder="值"
                    />
                  </TabsContent>

                  <TabsContent value="auth" className="mt-5">
                    <div className="space-y-4">
                      <select
                        value={currentTab.request.auth.type}
                        onChange={(event) =>
                          updateCurrentTabRequest((request) => ({
                            ...request,
                            auth: buildAuthConfig(event.target.value as ApiAuthType),
                          }))
                        }
                        className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm"
                      >
                        <option value="none">无认证</option>
                        <option value="bearer">Bearer Token</option>
                        <option value="basic">Basic Auth</option>
                        <option value="apiKey">API Key</option>
                      </select>

                      {currentTab.request.auth.type === 'bearer' ? (
                        <Input
                          value={currentTab.request.auth.token}
                          onChange={(event) =>
                            updateCurrentTabRequest((request) => ({
                              ...request,
                              auth: { ...request.auth, token: event.target.value },
                            }))
                          }
                          className="h-11 rounded-xl border-border/60"
                          placeholder="输入 Bearer Token"
                        />
                      ) : null}

                      {currentTab.request.auth.type === 'basic' ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          <Input
                            value={currentTab.request.auth.username}
                            onChange={(event) =>
                              updateCurrentTabRequest((request) => ({
                                ...request,
                                auth: { ...request.auth, username: event.target.value },
                              }))
                            }
                            className="h-11 rounded-xl border-border/60"
                            placeholder="用户名"
                          />
                          <Input
                            value={currentTab.request.auth.password}
                            onChange={(event) =>
                              updateCurrentTabRequest((request) => ({
                                ...request,
                                auth: { ...request.auth, password: event.target.value },
                              }))
                            }
                            className="h-11 rounded-xl border-border/60"
                            placeholder="密码"
                          />
                        </div>
                      ) : null}

                      {currentTab.request.auth.type === 'apiKey' ? (
                        <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)]">
                          <select
                            value={currentTab.request.auth.placement}
                            onChange={(event) =>
                              updateCurrentTabRequest((request) => ({
                                ...request,
                                auth: { ...request.auth, placement: event.target.value as 'header' | 'query' },
                              }))
                            }
                            className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm"
                          >
                            <option value="header">Header</option>
                            <option value="query">Query</option>
                          </select>
                          <Input
                            value={currentTab.request.auth.key}
                            onChange={(event) =>
                              updateCurrentTabRequest((request) => ({
                                ...request,
                                auth: { ...request.auth, key: event.target.value },
                              }))
                            }
                            className="h-11 rounded-xl border-border/60"
                            placeholder="参数名，例如 x-api-key"
                          />
                          <Input
                            value={currentTab.request.auth.value}
                            onChange={(event) =>
                              updateCurrentTabRequest((request) => ({
                                ...request,
                                auth: { ...request.auth, value: event.target.value },
                              }))
                            }
                            className="h-11 rounded-xl border-border/60"
                            placeholder="参数值，可用 {{token}}"
                          />
                        </div>
                      ) : null}
                    </div>
                  </TabsContent>

                  <TabsContent value="body" className="mt-5">
                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-[180px_180px]">
                        <select
                          value={currentTab.request.bodyMode}
                          onChange={(event) =>
                            updateCurrentTabRequest((request) => ({
                              ...request,
                              bodyMode: event.target.value as ApiBodyMode,
                            }))
                          }
                          className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm"
                        >
                          <option value="none">不发送 Body</option>
                          <option value="raw">Raw</option>
                          <option value="form">x-www-form-urlencoded</option>
                        </select>

                        {currentTab.request.bodyMode === 'raw' ? (
                          <select
                            value={currentTab.request.rawBodyType}
                            onChange={(event) =>
                              updateCurrentTabRequest((request) => ({
                                ...request,
                                rawBodyType: event.target.value as ApiRawBodyType,
                              }))
                            }
                            className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm"
                          >
                            {RAW_BODY_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </div>

                      {currentTab.request.bodyMode === 'raw' ? (
                        <textarea
                          value={currentTab.request.rawBody}
                          onChange={(event) =>
                            updateCurrentTabRequest((request) => ({
                              ...request,
                              rawBody: event.target.value,
                            }))
                          }
                          className="min-h-[260px] w-full rounded-[1.5rem] border border-border bg-muted/30 p-4 font-mono text-sm shadow-inner outline-none transition focus:border-primary"
                          placeholder="输入请求体，可使用 {{variable}} 引用环境变量。"
                          spellCheck={false}
                        />
                      ) : null}

                      {currentTab.request.bodyMode === 'form' ? (
                        <KeyValueEditor
                          rows={currentTab.request.formBody}
                          onChange={(rowId, field, value) => updateRowList('formBody', rowId, field, value)}
                          onAdd={() => addRow('formBody')}
                          onRemove={(rowId) => removeRow('formBody', rowId)}
                          keyPlaceholder="字段名"
                          valuePlaceholder="字段值"
                        />
                      ) : null}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-2">
                    <CardTitle className="text-base">响应</CardTitle>
                    {response ? (
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant={response.ok ? 'default' : 'destructive'}>{response.status}</Badge>
                        <span>{response.statusText || 'Response'}</span>
                        <span>{response.durationMs} ms</span>
                        <span>{formatBytes(response.sizeBytes)}</span>
                      </div>
                    ) : currentTab.error ? (
                      <div className="text-sm text-destructive">{currentTab.error}</div>
                    ) : (
                      <div className="text-sm text-muted-foreground">发送请求后，在这里查看响应内容。</div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="rounded-xl" disabled={!response?.body} onClick={copyResponseBody}>
                      <Copy className="mr-2 h-4 w-4" />
                      复制响应
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="rounded-xl" disabled={!response}>
                          <Copy className="mr-2 h-4 w-4" />
                          复制 cURL
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => copyCurl('powershell')}>PowerShell 多行</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyCurl('bash')}>Bash 多行</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyCurl('cmd')}>CMD 多行</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {currentTab.error ? (
                  <div className="rounded-[1.4rem] border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                    {currentTab.error}
                  </div>
                ) : null}

                <Tabs value={responsePanelTab} onValueChange={setResponsePanelTab}>
                  <TabsList className="flex w-full flex-wrap justify-start gap-2 rounded-2xl bg-muted/40 p-2">
                    <TabsTrigger value="pretty">Pretty</TabsTrigger>
                    <TabsTrigger value="raw">Raw</TabsTrigger>
                    <TabsTrigger value="headers">Headers</TabsTrigger>
                  </TabsList>

                  <TabsContent value="pretty" className="mt-5">
                    <CodeHighlighter
                      code={prettyResponseBody || currentTab.error || ''}
                      language={response?.contentType.includes('json') ? 'json' : 'text'}
                      className="w-full"
                      maxHeight="30rem"
                      showLineNumbers
                      wrapLongLines
                    />
                  </TabsContent>

                  <TabsContent value="raw" className="mt-5">
                    <CodeHighlighter
                      code={response?.body ?? ''}
                      language="text"
                      className="w-full"
                      maxHeight="30rem"
                      showLineNumbers
                      wrapLongLines
                    />
                  </TabsContent>

                  <TabsContent value="headers" className="mt-5">
                    <div className="space-y-3">
                      {response?.headers.length ? (
                        response.headers.map((header) => (
                          <div key={header.id} className="grid gap-3 rounded-[1.2rem] border border-border/60 bg-background/70 p-3 md:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)]">
                            <div className="font-mono text-sm font-medium">{header.key}</div>
                            <div className="break-all font-mono text-sm text-muted-foreground">{header.value}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">当前响应没有可展示的响应头。</div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageSection>
  );
}
