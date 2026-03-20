export type GeneratorModuleId =
  | 'uuid'
  | 'nanoid'
  | 'random'
  | 'password'
  | 'apiKey'
  | 'hash'
  | 'jwt'
  | 'timestamp'
  | 'userPersona'
  | 'userContact'
  | 'userAddress'
  | 'userCompany'
  | 'identity'
  | 'payment'
  | 'userProfile';

export type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512';
export type RandomValueMode = 'integer' | 'float' | 'string';
export type CountryPreset = 'cn' | 'us' | 'uk' | 'jp' | 'de';

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

export interface UserDataGenerateResult {
  country: string;
  localeLabel: string;
  text: string;
  items: string[];
  json: string;
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

export interface UserDataGenerateOptions {
  country: CountryPreset;
  count: number;
}

export interface IdentityGenerateOptions extends UserDataGenerateOptions {
  documentType: string;
}

export interface PaymentCardGenerateOptions extends UserDataGenerateOptions {
  brand: string;
}

export interface UserProfileGenerateOptions extends UserDataGenerateOptions {
  includeProfile: boolean;
  includeContact: boolean;
  includeAddress: boolean;
  includeCompany: boolean;
  includeIdentity: boolean;
  includePayment: boolean;
  includeAccount: boolean;
  includePreferences: boolean;
  includeDevice: boolean;
}

export const COUNTRY_PRESETS: Array<{ value: CountryPreset; label: string }> = [
  { value: 'cn', label: '中国大陆' },
  { value: 'us', label: '美国' },
  { value: 'uk', label: '英国' },
  { value: 'jp', label: '日本' },
  { value: 'de', label: '德国' },
];

export const GENERATOR_MODULES: Array<{ id: GeneratorModuleId; label: string; description: string; group: 'dev' | 'user' }> = [
  { id: 'uuid', label: 'UUID', description: '批量生成 UUID / GUID。', group: 'dev' },
  { id: 'nanoid', label: 'NanoID', description: '生成更短的随机 ID。', group: 'dev' },
  { id: 'random', label: '随机值', description: '生成整数、浮点数或随机字符串。', group: 'dev' },
  { id: 'password', label: '密码', description: '按规则生成测试密码。', group: 'dev' },
  { id: 'apiKey', label: 'API Key', description: '生成带前缀的 token/key。', group: 'dev' },
  { id: 'hash', label: 'Hash', description: '计算 MD5 / SHA 摘要。', group: 'dev' },
  { id: 'jwt', label: 'JWT', description: '生成或解析本地 mock JWT。', group: 'dev' },
  { id: 'timestamp', label: '时间戳', description: '快捷生成当前秒级与毫秒级时间戳。', group: 'dev' },
  { id: 'userPersona', label: '个人资料', description: '生成姓名、性别、年龄、生日和用户名。', group: 'user' },
  { id: 'userContact', label: '联系方式', description: '生成邮箱、手机号等联系数据。', group: 'user' },
  { id: 'userAddress', label: '地址', description: '生成符合国家格式的地址与邮编。', group: 'user' },
  { id: 'userCompany', label: '公司', description: '生成公司、职位与部门信息。', group: 'user' },
  { id: 'identity', label: '身份', description: '生成仅供测试的证件号与规则型身份字段。', group: 'user' },
  { id: 'payment', label: '支付', description: '生成测试银行卡号、品牌、有效期和 CVV。', group: 'user' },
  { id: 'userProfile', label: '组合档案', description: '按字段块自由拼装完整用户档案 JSON。', group: 'user' },
];

