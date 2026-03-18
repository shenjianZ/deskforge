/**
 * 公网 IP 工具相关类型定义
 */

/**
 * 公网 IP 信息
 */
export interface PublicIpInfo {
  /** 当前出口 IP 地址 */
  currentIp?: string;
  /** IPv4 地址 */
  ipv4?: string;
  /** IPv6 地址 */
  ipv6?: string;
  /** 国家 */
  country?: string;
  /** 地区 */
  region?: string;
  /** 城市 */
  city?: string;
  /** 时区 */
  timezone?: string;
  /** ASN */
  asn?: string;
  /** 组织 */
  organization?: string;
  /** ISP */
  isp?: string;
}
