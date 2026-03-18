import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ApiEnvironment,
  ApiFolder,
  ApiKeyValueRow,
  ApiRequestDraft,
  ApiResponseSnapshot,
  ApiSaveDestination,
  ApiSavedRequestItem,
  ApiWorkspaceTab,
} from '@/types/api';
import { cloneRequestDraft, createEmptyRequestDraft, createId, createKeyValueRow, deriveRequestTitle } from '@/lib/api-debugger';

interface ApiDebuggerState {
  tabs: ApiWorkspaceTab[];
  currentTabId: string;
  savedRequests: ApiSavedRequestItem[];
  folders: ApiFolder[];
  environments: ApiEnvironment[];
  currentEnvironmentId: string;
  createTab: (request?: ApiRequestDraft, title?: string, sourceKey?: string) => void;
  selectTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  updateCurrentTabRequest: (updater: (request: ApiRequestDraft) => ApiRequestDraft) => void;
  setCurrentTabResponse: (response: ApiResponseSnapshot | null, error?: string | null) => void;
  duplicateCurrentTab: () => void;
  saveCurrentRequest: (destination: ApiSaveDestination) => void;
  openSavedRequest: (requestId: string) => void;
  renameSavedRequest: (requestId: string, title: string) => void;
  removeSavedRequest: (requestId: string) => void;
  moveSavedRequest: (requestId: string, destination: ApiSaveDestination) => void;
  createFolder: (parentFolderId?: string | null) => string;
  renameFolder: (folderId: string, name: string) => void;
  deleteFolder: (folderId: string) => void;
  moveFolder: (folderId: string, parentFolderId: string | null) => void;
  createEnvironment: () => void;
  setCurrentEnvironment: (environmentId: string) => void;
  renameEnvironment: (environmentId: string, name: string) => void;
  addEnvironmentVariable: (environmentId: string) => void;
  updateEnvironmentVariable: (environmentId: string, rowId: string, field: keyof ApiKeyValueRow, value: string | boolean) => void;
  removeEnvironmentVariable: (environmentId: string, rowId: string) => void;
}

const STORAGE_VERSION = 3;

function createTabFromRequest(request?: ApiRequestDraft, title?: string, sourceKey?: string): ApiWorkspaceTab {
  const nextRequest = request ? cloneRequestDraft(request) : createEmptyRequestDraft();
  return {
    id: createId('tab'),
    title: title ?? deriveRequestTitle(nextRequest),
    request: nextRequest,
    response: null,
    error: null,
    sourceKey,
    updatedAt: new Date().toISOString(),
  };
}

function makeRequestSourceKey(requestId: string, parentFolderId: string | null) {
  return parentFolderId ? `folder:${parentFolderId}:${requestId}` : `root:${requestId}`;
}

function parseSourceKey(sourceKey?: string) {
  if (!sourceKey) {
    return null;
  }

  if (sourceKey.startsWith('root:')) {
    return { requestId: sourceKey.slice('root:'.length), parentFolderId: null as string | null };
  }

  if (sourceKey.startsWith('folder:')) {
    const [, folderId, requestId] = sourceKey.split(':');
    if (folderId && requestId) {
      return { requestId, parentFolderId: folderId };
    }
  }

  return null;
}

function openOrFocusTab(
  state: Pick<ApiDebuggerState, 'tabs' | 'currentTabId'>,
  request: ApiRequestDraft,
  title: string,
  sourceKey: string
) {
  const existingTab = state.tabs.find((tab) => tab.sourceKey === sourceKey);

  if (existingTab) {
    return {
      tabs: state.tabs.map((tab) =>
        tab.id === existingTab.id
          ? {
              ...tab,
              title,
              request: cloneRequestDraft(request),
              updatedAt: new Date().toISOString(),
            }
          : tab
      ),
      currentTabId: existingTab.id,
    };
  }

  const nextTab = createTabFromRequest(request, title, sourceKey);
  return {
    tabs: [...state.tabs, nextTab],
    currentTabId: nextTab.id,
  };
}

function updateTabSource(
  tabs: ApiWorkspaceTab[],
  requestId: string,
  title: string,
  request: ApiRequestDraft,
  parentFolderId: string | null
) {
  const previousCandidates = [makeRequestSourceKey(requestId, null), ...tabs.map((tab) => tab.sourceKey).filter(Boolean)] as string[];
  const matchedSourceKey = previousCandidates.find((sourceKey) =>
    sourceKey ? parseSourceKey(sourceKey)?.requestId === requestId : false
  );

  if (!matchedSourceKey) {
    return tabs;
  }

  const nextSourceKey = makeRequestSourceKey(requestId, parentFolderId);
  return tabs.map((tab) =>
    tab.sourceKey === matchedSourceKey
      ? {
          ...tab,
          title,
          request: cloneRequestDraft(request),
          sourceKey: nextSourceKey,
          updatedAt: new Date().toISOString(),
        }
      : tab
  );
}

function detachTabSourceByRequestId(tabs: ApiWorkspaceTab[], requestId: string) {
  return tabs.map((tab) => {
    const source = parseSourceKey(tab.sourceKey);
    return source?.requestId === requestId ? { ...tab, sourceKey: undefined, updatedAt: new Date().toISOString() } : tab;
  });
}

function isFolderDescendant(folderId: string, targetParentId: string | null, folders: ApiFolder[]) {
  if (!targetParentId) {
    return false;
  }

  let currentId: string | null = targetParentId;
  while (currentId) {
    if (currentId === folderId) {
      return true;
    }
    currentId = folders.find((folder) => folder.id === currentId)?.parentFolderId ?? null;
  }

  return false;
}

const initialEnvironmentId = createId('env');
const initialTab = createTabFromRequest();

export const useApiDebuggerStore = create<ApiDebuggerState>()(
  persist(
    (set, get) => ({
      tabs: [initialTab],
      currentTabId: initialTab.id,
      savedRequests: [],
      folders: [],
      environments: [
        {
          id: initialEnvironmentId,
          name: '默认环境',
          variables: [createKeyValueRow({ key: 'baseUrl', value: 'https://httpbin.org' })],
          updatedAt: new Date().toISOString(),
        },
      ],
      currentEnvironmentId: initialEnvironmentId,

      createTab: (request, title, sourceKey) =>
        set((state) => {
          const tab = createTabFromRequest(request, title, sourceKey);
          return {
            tabs: [...state.tabs, tab],
            currentTabId: tab.id,
          };
        }),

      selectTab: (tabId) => set({ currentTabId: tabId }),

      closeTab: (tabId) =>
        set((state) => {
          const remainingTabs = state.tabs.filter((tab) => tab.id !== tabId);
          if (remainingTabs.length === 0) {
            const fallback = createTabFromRequest();
            return {
              tabs: [fallback],
              currentTabId: fallback.id,
            };
          }

          return {
            tabs: remainingTabs,
            currentTabId: state.currentTabId === tabId ? remainingTabs[Math.max(0, remainingTabs.length - 1)].id : state.currentTabId,
          };
        }),

      updateCurrentTabRequest: (updater) =>
        set((state) => ({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.currentTabId) {
              return tab;
            }

            const request = updater(cloneRequestDraft(tab.request));
            return {
              ...tab,
              request,
              title: deriveRequestTitle(request),
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      setCurrentTabResponse: (response, error = null) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === state.currentTabId
              ? {
                  ...tab,
                  response,
                  error,
                  updatedAt: new Date().toISOString(),
                }
              : tab
          ),
        })),

      duplicateCurrentTab: () => {
        const currentTab = get().tabs.find((tab) => tab.id === get().currentTabId);
        if (currentTab) {
          get().createTab(currentTab.request, `${currentTab.title} 副本`);
        }
      },

      saveCurrentRequest: (destination) =>
        set((state) => {
          const currentTab = state.tabs.find((tab) => tab.id === state.currentTabId);
          if (!currentTab) {
            return state;
          }

          const source = parseSourceKey(currentTab.sourceKey);
          const parentFolderId = destination.type === 'folder' ? destination.folderId : null;
          const title = currentTab.title;
          const request = cloneRequestDraft(currentTab.request);
          const updatedAt = new Date().toISOString();

          if (source) {
            const existing = state.savedRequests.find((item) => item.id === source.requestId);
            if (!existing) {
              return state;
            }

            return {
              savedRequests: [
                {
                  ...existing,
                  title,
                  request,
                  parentFolderId,
                  updatedAt,
                  responseSummary: currentTab.response
                    ? { status: currentTab.response.status, durationMs: currentTab.response.durationMs }
                    : existing.responseSummary,
                },
                ...state.savedRequests.filter((item) => item.id !== existing.id),
              ],
              tabs: state.tabs.map((tab) =>
                tab.id === state.currentTabId
                  ? {
                      ...tab,
                      title,
                      request,
                      sourceKey: makeRequestSourceKey(existing.id, parentFolderId),
                      updatedAt,
                    }
                  : tab
              ),
            };
          }

          const item: ApiSavedRequestItem = {
            id: createId('request'),
            title,
            request,
            parentFolderId,
            updatedAt,
            responseSummary: currentTab.response
              ? { status: currentTab.response.status, durationMs: currentTab.response.durationMs }
              : undefined,
          };

          return {
            savedRequests: [item, ...state.savedRequests],
            tabs: state.tabs.map((tab) =>
              tab.id === state.currentTabId
                ? {
                    ...tab,
                    title,
                    request,
                    sourceKey: makeRequestSourceKey(item.id, parentFolderId),
                    updatedAt,
                  }
                : tab
            ),
          };
        }),

      openSavedRequest: (requestId) => {
        const item = get().savedRequests.find((request) => request.id === requestId);
        if (!item) {
          return;
        }

        set((state) => openOrFocusTab(state, item.request, item.title, makeRequestSourceKey(item.id, item.parentFolderId)));
      },

      renameSavedRequest: (requestId, title) =>
        set((state) => {
          const existing = state.savedRequests.find((item) => item.id === requestId);
          if (!existing) {
            return state;
          }

          return {
            savedRequests: state.savedRequests.map((item) => (item.id === requestId ? { ...item, title, updatedAt: new Date().toISOString() } : item)),
            tabs: updateTabSource(state.tabs, requestId, title, existing.request, existing.parentFolderId),
          };
        }),

      removeSavedRequest: (requestId) =>
        set((state) => ({
          savedRequests: state.savedRequests.filter((item) => item.id !== requestId),
          tabs: detachTabSourceByRequestId(state.tabs, requestId),
        })),

      moveSavedRequest: (requestId, destination) =>
        set((state) => {
          const existing = state.savedRequests.find((item) => item.id === requestId);
          if (!existing) {
            return state;
          }

          const parentFolderId = destination.type === 'folder' ? destination.folderId : null;
          return {
            savedRequests: [
              {
                ...existing,
                parentFolderId,
                updatedAt: new Date().toISOString(),
              },
              ...state.savedRequests.filter((item) => item.id !== requestId),
            ],
            tabs: updateTabSource(state.tabs, requestId, existing.title, existing.request, parentFolderId),
          };
        }),

      createFolder: (parentFolderId = null) => {
        const folderId = createId('folder');
        set((state) => ({
          folders: [
            {
              id: folderId,
              name: `新文件夹 ${state.folders.length + 1}`,
              parentFolderId,
              updatedAt: new Date().toISOString(),
            },
            ...state.folders,
          ],
        }));
        return folderId;
      },

      renameFolder: (folderId, name) =>
        set((state) => ({
          folders: state.folders.map((folder) => (folder.id === folderId ? { ...folder, name, updatedAt: new Date().toISOString() } : folder)),
        })),

      deleteFolder: (folderId) =>
        set((state) => {
          const folder = state.folders.find((item) => item.id === folderId);
          if (!folder) {
            return state;
          }

          return {
            folders: state.folders
              .filter((item) => item.id !== folderId)
              .map((item) =>
                item.parentFolderId === folderId ? { ...item, parentFolderId: folder.parentFolderId, updatedAt: new Date().toISOString() } : item
              ),
            savedRequests: state.savedRequests.map((item) =>
              item.parentFolderId === folderId ? { ...item, parentFolderId: folder.parentFolderId, updatedAt: new Date().toISOString() } : item
            ),
            tabs: state.tabs.map((tab) => {
              const source = parseSourceKey(tab.sourceKey);
              if (source && source.parentFolderId === folderId) {
                return {
                  ...tab,
                  sourceKey: makeRequestSourceKey(source.requestId, folder.parentFolderId),
                  updatedAt: new Date().toISOString(),
                };
              }
              return tab;
            }),
          };
        }),

      moveFolder: (folderId, parentFolderId) =>
        set((state) => {
          if (folderId === parentFolderId || isFolderDescendant(folderId, parentFolderId, state.folders)) {
            return state;
          }

          return {
            folders: state.folders.map((folder) =>
              folder.id === folderId ? { ...folder, parentFolderId, updatedAt: new Date().toISOString() } : folder
            ),
          };
        }),

      createEnvironment: () =>
        set((state) => {
          const environment: ApiEnvironment = {
            id: createId('env'),
            name: `环境 ${state.environments.length + 1}`,
            variables: [createKeyValueRow()],
            updatedAt: new Date().toISOString(),
          };

          return {
            environments: [...state.environments, environment],
            currentEnvironmentId: environment.id,
          };
        }),

      setCurrentEnvironment: (environmentId) => set({ currentEnvironmentId: environmentId }),

      renameEnvironment: (environmentId, name) =>
        set((state) => ({
          environments: state.environments.map((environment) =>
            environment.id === environmentId ? { ...environment, name, updatedAt: new Date().toISOString() } : environment
          ),
        })),

      addEnvironmentVariable: (environmentId) =>
        set((state) => ({
          environments: state.environments.map((environment) =>
            environment.id === environmentId
              ? { ...environment, variables: [...environment.variables, createKeyValueRow()], updatedAt: new Date().toISOString() }
              : environment
          ),
        })),

      updateEnvironmentVariable: (environmentId, rowId, field, value) =>
        set((state) => ({
          environments: state.environments.map((environment) =>
            environment.id === environmentId
              ? {
                  ...environment,
                  variables: environment.variables.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
                  updatedAt: new Date().toISOString(),
                }
              : environment
          ),
        })),

      removeEnvironmentVariable: (environmentId, rowId) =>
        set((state) => ({
          environments: state.environments.map((environment) =>
            environment.id === environmentId
              ? { ...environment, variables: environment.variables.filter((row) => row.id !== rowId), updatedAt: new Date().toISOString() }
              : environment
          ),
        })),
    }),
    {
      name: 'deskforge-api-debugger',
      version: STORAGE_VERSION,
      migrate: (persistedState: unknown) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState;
        }

        const state = persistedState as Record<string, unknown>;
        const localRequests = Array.isArray(state.localRequests) ? state.localRequests : [];
        const collections = Array.isArray(state.collections) ? state.collections : [];

        if (!Array.isArray(state.savedRequests)) {
          state.savedRequests = [
            ...localRequests.map((item) => ({ ...item, parentFolderId: null })),
            ...collections.flatMap((collection) =>
              Array.isArray(collection.requests)
                ? collection.requests.map((request: Record<string, unknown>) => ({
                    ...request,
                    parentFolderId: collection.id as string,
                  }))
                : []
            ),
          ];
        }

        if (!Array.isArray(state.folders)) {
          state.folders = collections.map((collection) => ({
            id: collection.id,
            name: collection.name,
            parentFolderId: null,
            updatedAt: collection.updatedAt,
          }));
        }

        delete state.localRequests;
        delete state.collections;
        delete state.history;
        return state;
      },
      partialize: (state) => ({
        savedRequests: state.savedRequests,
        folders: state.folders,
        environments: state.environments,
        currentEnvironmentId: state.currentEnvironmentId,
      }),
    }
  )
);
