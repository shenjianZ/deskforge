export type GeneratorModuleId = 'uuid' | 'nanoid' | 'random' | 'password' | 'apiKey' | 'hash' | 'jwt' | 'timestamp';
export type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512';
export type RandomValueMode = 'integer' | 'float' | 'string';

export interface GeneratorItemsResult {
  text: string;
  items: string[];
  meta: string[];
}

export interface HashGenerateResult {
  algorithm: string;
  value: string;
  meta: string[];
}

export interface JwtGenerateResult {
  token: string;
  headerPretty: string;
  payloadPretty: string;
  meta: string[];
}

export interface JwtDecodeResult {
  headerPretty: string;
  payloadPretty: string;
  signature: string;
  meta: string[];
}

export interface UuidGenerateOptions {
  count: number;
  uppercase: boolean;
  removeHyphens: boolean;
}

export interface NanoIdGenerateOptions {
  length: number;
  count: number;
  alphabet?: string | null;
}

export interface RandomValueGenerateOptions {
  mode: RandomValueMode;
  count: number;
  min: number;
  max: number;
  decimalPlaces: number;
  length: number;
  charset?: string | null;
}

export interface PasswordGenerateOptions {
  length: number;
  count: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeSimilar: boolean;
}

export interface ApiKeyGenerateOptions {
  prefix: string;
  length: number;
  count: number;
  separator: string;
}

export interface HashGenerateOptions {
  algorithm: HashAlgorithm;
  input: string;
}

export interface JwtGenerateOptions {
  payloadJson: string;
  secret: string;
  headerJson: string;
}

export interface JwtDecodeOptions {
  token: string;
}

export const GENERATOR_MODULES: Array<{ id: GeneratorModuleId; label: string; description: string }> = [
  { id: 'uuid', label: 'UUID', description: '批量生成 UUID / GUID。' },
  { id: 'nanoid', label: 'NanoID', description: '生成更短的随机 ID。' },
  { id: 'random', label: '随机值', description: '生成整数、浮点数或随机字符串。' },
  { id: 'password', label: '密码', description: '按规则生成测试密码。' },
  { id: 'apiKey', label: 'API Key', description: '生成带前缀的 token/key。' },
  { id: 'hash', label: 'Hash', description: '计算 MD5 / SHA 摘要。' },
  { id: 'jwt', label: 'JWT', description: '生成或解析本地 mock JWT。' },
  { id: 'timestamp', label: '时间戳', description: '快捷生成当前秒级与毫秒级时间戳。' },
];
