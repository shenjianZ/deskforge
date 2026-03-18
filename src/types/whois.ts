/**
 * WHOIS 查询工具相关类型定义
 */

/**
 * WHOIS 查询配置
 */
export interface WhoisLookupConfig {
  /** 域名 */
  domain: string;
}

/**
 * 域名事件
 */
export interface WhoisEventInfo {
  /** 事件类型 */
  eventAction: string;
  /** 事件时间 */
  eventDate: string;
}

/**
 * WHOIS 查询结果
 */
export interface WhoisLookupResult {
  /** 是否成功 */
  success: boolean;
  /** 域名 */
  domain: string;
  /** 注册商 */
  registrar?: string;
  /** 注册局 ID */
  handle?: string;
  /** 状态列表 */
  statuses: string[];
  /** 名称服务器 */
  nameservers: string[];
  /** 关键事件 */
  events: WhoisEventInfo[];
  /** 原始响应 */
  rawResponse: string;
  /** 错误信息 */
  error?: string;
}
