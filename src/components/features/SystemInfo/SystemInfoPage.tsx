import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor, Cpu, HardDrive, Database, Computer, RefreshCw, Clock, Play, Pause, Network, Wifi } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageSection } from '@/components/layout/PageSection';
import type { SystemInfo } from '@/types/system';

export function SystemInfoPage() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 自动刷新相关状态
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(3); // 默认3秒
  const [nextRefreshIn, setNextRefreshIn] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // 刷新间隔选项（秒）
  const intervalOptions = [1, 3, 5, 10, 30];

  // 获取系统信息
  const fetchSystemInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const info = await invoke<SystemInfo>('get_system_info');
      setSystemInfo(info);
      // 重置倒计时
      setNextRefreshIn(refreshInterval);
    } catch (err) {
      console.error('获取系统信息失败:', err);
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [refreshInterval]);

  // 启动自动刷新
  const startAutoRefresh = useCallback(() => {
    // 清除现有定时器
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    // 立即刷新一次
    fetchSystemInfo();

    // 设置刷新定时器
    intervalRef.current = setInterval(() => {
      fetchSystemInfo();
    }, refreshInterval * 1000);

    // 设置倒计时定时器（每秒更新一次）
    setNextRefreshIn(refreshInterval);
    countdownRef.current = setInterval(() => {
      setNextRefreshIn((prev) => {
        if (prev <= 1) {
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);
  }, [refreshInterval, fetchSystemInfo]);

  // 停止自动刷新
  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setNextRefreshIn(0);
  }, []);

  // 切换自动刷新
  const toggleAutoRefresh = useCallback(() => {
    if (autoRefresh) {
      stopAutoRefresh();
      setAutoRefresh(false);
    } else {
      startAutoRefresh();
      setAutoRefresh(true);
    }
  }, [autoRefresh, startAutoRefresh, stopAutoRefresh]);

  // 当刷新间隔改变时，重启自动刷新
  useEffect(() => {
    if (autoRefresh) {
      startAutoRefresh();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [refreshInterval, autoRefresh, startAutoRefresh]);

  // 初始加载
  useEffect(() => {
    if (!autoRefresh) {
      fetchSystemInfo();
    }
  }, [autoRefresh, fetchSystemInfo]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // 格式化显示
  const formatGB = (value: number) => `${value.toFixed(2)} GB`;

  return (
    <PageSection className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="系统信息" backTo="/" />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex items-center gap-2">
              {/* 自动刷新控制 */}
              {autoRefresh && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="w-3 h-3" />
                  {nextRefreshIn}s
                </Badge>
              )}

              <Button
                size="sm"
                variant={autoRefresh ? "default" : "outline"}
                onClick={toggleAutoRefresh}
                className="gap-2"
              >
                {autoRefresh ? (
                  <>
                    <Pause className="w-4 h-4" />
                    停止
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    自动刷新
                  </>
                )}
              </Button>

              {/* 刷新间隔选择 */}
              {autoRefresh && (
                <div className="flex items-center gap-1 border rounded-md px-2">
                  <span className="text-xs text-muted-foreground">间隔:</span>
                  {intervalOptions.map((interval) => (
                    <button
                      key={interval}
                      onClick={() => setRefreshInterval(interval)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        refreshInterval === interval
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {interval}s
                    </button>
                  ))}
                </div>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={fetchSystemInfo}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    刷新中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    手动刷新
                  </>
                )}
              </Button>
            </div>
        </div>

        {error && (
          <Card className="mb-4 border-destructive">
            <CardContent className="p-4">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {systemInfo && (
          <div>
            {/* 顶部2列：系统、计算机 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* 操作系统 */}
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">操作系统</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="py-3">
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">系统</span><span className="text-sm font-medium">{systemInfo.os.name}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">版本</span><span className="text-sm font-medium">{systemInfo.os.version}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">架构</span><span className="text-sm font-medium">{systemInfo.os.arch}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">主机名</span><span className="text-sm font-medium">{systemInfo.os.hostName}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">运行时间</span><span className="text-sm font-medium">{systemInfo.os.uptimeReadable}</span></div>
                  </div>
                </CardContent>
              </Card>

              {/* 计算机信息 */}
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center gap-2">
                    <Computer className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">计算机信息</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="py-3">
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">计算机名</span><span className="text-sm font-medium">{systemInfo.computer.name}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">用户名</span><span className="text-sm font-medium">{systemInfo.computer.username}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">域/组</span><span className="text-sm font-medium">{systemInfo.computer.domain}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">制造商</span><span className="text-sm font-medium">{systemInfo.computer.manufacturer}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">型号</span><span className="text-sm font-medium">{systemInfo.computer.model}</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 中部2列：CPU 和 内存 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* CPU */}
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">处理器</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="py-3">
                  <div className="space-y-3">
                    <div className="text-base font-medium">{systemInfo.cpu.model}</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-xs text-muted-foreground">核心</div>
                        <div className="font-semibold text-base">{systemInfo.cpu.cores}</div>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-xs text-muted-foreground">线程</div>
                        <div className="font-semibold text-base">{systemInfo.cpu.processors}</div>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-xs text-muted-foreground">频率</div>
                        <div className="font-semibold text-sm">{systemInfo.cpu.maxFrequency}MHz</div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-muted-foreground">使用率</span>
                        <span className="text-sm font-medium">{systemInfo.cpu.usagePercent.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${systemInfo.cpu.usagePercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 内存 */}
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">内存</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="py-3">
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-xs text-muted-foreground">总内存</div>
                        <div className="font-semibold text-sm">{formatGB(systemInfo.memory.totalGb)}</div>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-xs text-muted-foreground">已用</div>
                        <div className="font-semibold text-sm">{formatGB(systemInfo.memory.usedGb)}</div>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-xs text-muted-foreground">可用</div>
                        <div className="font-semibold text-sm text-green-600">{formatGB(systemInfo.memory.availableGb)}</div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-muted-foreground">使用率</span>
                        <span className="text-sm font-medium">{systemInfo.memory.usagePercent.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${systemInfo.memory.usagePercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 中下部：GPU、网络 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* GPU */}
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">显卡 (GPU)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="py-3">
                  {systemInfo.gpu.length === 0 ? (
                    <p className="text-sm text-muted-foreground">未检测到显卡</p>
                  ) : (
                    <div className="space-y-3">
                      {systemInfo.gpu.map((gpu, index) => (
                        <div key={index} className="border-l-2 border-primary pl-3 py-1">
                          <div className="text-sm font-medium mb-1">{gpu.name}</div>
                          <div className="flex gap-3 text-sm">
                            <span className="text-muted-foreground">显存: <span className="font-medium">{gpu.vramGb.toFixed(1)} GB</span></span>
                            <span className="text-muted-foreground">驱动: <span className="font-medium">{gpu.driverVersion}</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 显示器 */}
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">显示器</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="py-3">
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">数量</span><span className="text-sm font-medium">{systemInfo.display.monitorCount}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">主分辨率</span><span className="text-sm font-medium">{systemInfo.display.primaryResolution}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-muted-foreground">所有分辨率</span><span className="text-sm font-medium">{systemInfo.display.allResolutions.join(', ')}</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 网络信息 */}
            <Card className="mb-4">
              <CardHeader className="py-3">
                <div className="flex items-center gap-2">
                  <Network className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">网络</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="py-3">
                <div className="flex gap-4 mb-3">
                  <div className="flex-1 bg-muted/50 rounded p-2 text-center">
                    <div className="text-xs text-muted-foreground">总下载</div>
                    <div className="font-semibold text-base text-green-600">{systemInfo.network.totalDownloadedMb.toFixed(2)} MB</div>
                  </div>
                  <div className="flex-1 bg-muted/50 rounded p-2 text-center">
                    <div className="text-xs text-muted-foreground">总上传</div>
                    <div className="font-semibold text-base text-blue-600">{systemInfo.network.totalUploadedMb.toFixed(2)} MB</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {systemInfo.network.interfaces.map((iface, index) => (
                    <div key={index} className="border rounded p-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                          <Wifi className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">{iface.name}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-green-600">↓{iface.downloadSpeedKb.toFixed(1)}</span>
                          <span className="text-blue-600 ml-1">↑{iface.uploadSpeedKb.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">{iface.macAddress}</div>
                      {iface.ipNetworks.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {iface.ipNetworks.map((ip, ipIndex) => (
                            <Badge key={ipIndex} variant="outline" className="text-xs px-2 py-0 h-5">
                              {ip}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 磁盘信息 */}
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">磁盘</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="py-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {systemInfo.disks.map((disk, index) => (
                    <div key={index} className="border rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-sm">{disk.driveLetter}</Badge>
                          <span className="text-base font-medium">{disk.volumeLabel}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{disk.fileSystem}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-2 text-center">
                        <div>
                          <div className="text-xs text-muted-foreground">总容量</div>
                          <div className="text-sm font-medium">{formatGB(disk.totalGb)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">已用</div>
                          <div className="text-sm font-medium">{formatGB(disk.usedGb)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">可用</div>
                          <div className="text-sm font-medium text-green-600">{formatGB(disk.availableGb)}</div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-muted-foreground">使用率</span>
                          <span className="text-sm font-medium">{disk.usagePercent.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              disk.usagePercent > 90 ? 'bg-red-500' : 'bg-primary'
                            }`}
                            style={{ width: `${Math.min(disk.usagePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      </div>
    </PageSection>
  );
}
