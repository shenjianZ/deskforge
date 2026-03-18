/**
 * DNS 查询工具相关类型定义
 */

/**
 * DNS 记录类型
 */
export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS';

/**
 * DNS 查询配置
 */
export interface DnsLookupConfig {
  /** 域名 */
  domain: string;
  /** 记录类型 */
  recordType: DnsRecordType;
}

/**
 * DNS 记录
 */
export interface DnsLookupRecord {
  /** 名称 */
  name: string;
  /** 记录类型 */
  recordType: string;
  /** TTL */
  ttl: number;
  /** 数据 */
  data: string;
}

/**
 * DNS 查询结果
 */
export interface DnsLookupResult {
  /** 是否成功 */
  success: boolean;
  /** 查询域名 */
  domain: string;
  /** 查询记录类型 */
  recordType: string;
  /** DNS 状态码 */
  status: number;
  /** 是否带权威答案 */
  authoritative: boolean;
  /** 查询结果 */
  answers: DnsLookupRecord[];
  /** 原始响应 */
  rawResponse: string;
  /** 错误信息 */
  error?: string;
}
