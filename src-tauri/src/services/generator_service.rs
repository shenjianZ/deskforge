//! 生成器业务逻辑
//!
//! 提供 UUID、NanoID、密码、Hash、JWT 等本地生成能力

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use hmac::{Hmac, Mac};
use rand::{distributions::Alphanumeric, rngs::OsRng, seq::SliceRandom, Rng};
use serde_json::{json, Value};
use sha1::Sha1;
use sha2::{Digest, Sha256, Sha512};
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    models::generator::{
        ApiKeyGenerateOptions, GeneratorItemsResult, HashAlgorithm, HashGenerateOptions, HashGenerateResult, JwtDecodeOptions,
        JwtDecodeResult, JwtGenerateOptions, JwtGenerateResult, NanoIdGenerateOptions, PasswordGenerateOptions,
        RandomValueGenerateOptions, RandomValueMode, UuidGenerateOptions,
    },
};

type HmacSha256 = Hmac<Sha256>;

const DEFAULT_NANOID_ALPHABET: &str = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";
const SYMBOLS: &str = "!@#$%^&*()-_=+[]{};:,.?/";
const SIMILAR_CHARS: &str = "0O1lI";

pub struct GeneratorService;

impl GeneratorService {
    pub fn generate_uuid(options: &UuidGenerateOptions) -> AppResult<GeneratorItemsResult> {
        let count = normalize_count(options.count)?;
        let items = (0..count)
            .map(|_| {
                let mut value = Uuid::new_v4().to_string();
                if options.remove_hyphens {
                    value = value.replace('-', "");
                }
                if options.uppercase {
                    value = value.to_uppercase();
                }
                value
            })
            .collect::<Vec<_>>();

        Ok(build_items_result(items, vec![format!("批量: {}", count)]))
    }

    pub fn generate_nanoid(options: &NanoIdGenerateOptions) -> AppResult<GeneratorItemsResult> {
        let count = normalize_count(options.count)?;
        let length = normalize_length(options.length, 8, 128, "NanoID 长度")?;
        let alphabet = options.alphabet.as_deref().unwrap_or(DEFAULT_NANOID_ALPHABET);
        let alphabet_chars = unique_chars(alphabet)?;
        let mut rng = OsRng;
        let mut items = Vec::with_capacity(count);

        for _ in 0..count {
            let mut value = String::with_capacity(length);
            for _ in 0..length {
                let ch = alphabet_chars
                    .choose(&mut rng)
                    .ok_or_else(|| AppError::InvalidData("NanoID 字符集不能为空".to_string()))?;
                value.push(*ch);
            }
            items.push(value);
        }

        Ok(build_items_result(
            items,
            vec![format!("长度: {}", length), format!("字符集: {} 个字符", alphabet_chars.len())],
        ))
    }

    pub fn generate_random_value(options: &RandomValueGenerateOptions) -> AppResult<GeneratorItemsResult> {
        let count = normalize_count(options.count)?;
        let mut rng = OsRng;
        let items = match options.mode {
            RandomValueMode::Integer => {
                validate_min_max(options.min, options.max)?;
                (0..count)
                    .map(|_| rng.gen_range(options.min..=options.max).to_string())
                    .collect::<Vec<_>>()
            }
            RandomValueMode::Float => {
                validate_min_max(options.min, options.max)?;
                let min = options.min as f64;
                let max = options.max as f64;
                let factor = 10_f64.powi(i32::from(options.decimal_places));
                (0..count)
                    .map(|_| {
                        let raw = rng.gen_range(min..=max);
                        let rounded = (raw * factor).round() / factor;
                        format!("{:.*}", usize::from(options.decimal_places), rounded)
                    })
                    .collect::<Vec<_>>()
            }
            RandomValueMode::String => {
                let length = normalize_length(options.length, 1, 256, "随机字符串长度")?;
                let charset = options.charset.as_deref().unwrap_or(DEFAULT_NANOID_ALPHABET);
                let alphabet_chars = unique_chars(charset)?;
                (0..count)
                    .map(|_| {
                        let mut value = String::with_capacity(length);
                        for _ in 0..length {
                            let ch = alphabet_chars.choose(&mut rng).expect("alphabet validated");
                            value.push(*ch);
                        }
                        value
                    })
                    .collect::<Vec<_>>()
            }
        };

        Ok(build_items_result(items, vec![format!("模式: {:?}", options.mode)]))
    }

    pub fn generate_password(options: &PasswordGenerateOptions) -> AppResult<GeneratorItemsResult> {
        let count = normalize_count(options.count)?;
        let length = normalize_length(options.length, 4, 256, "密码长度")?;
        let pools = build_password_pools(options)?;
        let mut rng = OsRng;
        let mut items = Vec::with_capacity(count);

        for _ in 0..count {
            let mut chars = Vec::with_capacity(length);
            for pool in &pools {
                let ch = pool.choose(&mut rng).ok_or_else(|| AppError::InvalidData("密码字符池不能为空".to_string()))?;
                chars.push(*ch);
            }
            while chars.len() < length {
                let pool = pools.choose(&mut rng).expect("pools validated");
                let ch = pool.choose(&mut rng).expect("pool validated");
                chars.push(*ch);
            }
            chars.shuffle(&mut rng);
            items.push(chars.into_iter().collect::<String>());
        }

        Ok(build_items_result(items, vec![format!("长度: {}", length), format!("规则组数: {}", pools.len())]))
    }

    pub fn generate_api_key(options: &ApiKeyGenerateOptions) -> AppResult<GeneratorItemsResult> {
        let count = normalize_count(options.count)?;
        let length = normalize_length(options.length, 8, 128, "Key 长度")?;
        let mut rng = OsRng;
        let mut items = Vec::with_capacity(count);

        for _ in 0..count {
            let random = std::iter::repeat_with(|| rng.sample(Alphanumeric))
                .take(length)
                .map(char::from)
                .collect::<String>();
            let value = if options.prefix.trim().is_empty() {
                random
            } else {
                format!("{}{}{}", options.prefix.trim(), options.separator, random)
            };
            items.push(value);
        }

        Ok(build_items_result(items, vec![format!("长度: {}", length)]))
    }

    pub fn generate_hash(options: &HashGenerateOptions) -> AppResult<HashGenerateResult> {
        if options.input.is_empty() {
            return Err(AppError::InvalidData("输入内容不能为空".to_string()));
        }

        let value = match options.algorithm {
            HashAlgorithm::Md5 => format!("{:x}", md5::compute(options.input.as_bytes())),
            HashAlgorithm::Sha1 => {
                let mut hasher = Sha1::new();
                hasher.update(options.input.as_bytes());
                hex::encode(hasher.finalize())
            }
            HashAlgorithm::Sha256 => {
                let mut hasher = Sha256::new();
                hasher.update(options.input.as_bytes());
                hex::encode(hasher.finalize())
            }
            HashAlgorithm::Sha512 => {
                let mut hasher = Sha512::new();
                hasher.update(options.input.as_bytes());
                hex::encode(hasher.finalize())
            }
        };

        Ok(HashGenerateResult {
            algorithm: format_hash_algorithm(options.algorithm).to_string(),
            value,
            meta: vec![format!("输入长度: {}", options.input.chars().count())],
        })
    }

    pub fn generate_jwt(options: &JwtGenerateOptions) -> AppResult<JwtGenerateResult> {
        let payload = parse_json(&options.payload_json, "Payload JSON")?;
        let header = if options.header_json.trim().is_empty() {
            json!({ "alg": "HS256", "typ": "JWT" })
        } else {
            parse_json(&options.header_json, "Header JSON")?
        };
        let secret = if options.secret.is_empty() {
            "deskforge-dev-secret"
        } else {
            options.secret.as_str()
        };

        let header_compact = serde_json::to_vec(&header)
            .map_err(|error| AppError::InvalidData(format!("序列化 JWT Header 失败: {}", error)))?;
        let payload_compact = serde_json::to_vec(&payload)
            .map_err(|error| AppError::InvalidData(format!("序列化 JWT Payload 失败: {}", error)))?;

        let header_segment = URL_SAFE_NO_PAD.encode(header_compact);
        let payload_segment = URL_SAFE_NO_PAD.encode(payload_compact);
        let message = format!("{}.{}", header_segment, payload_segment);

        let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
            .map_err(|error| AppError::InvalidData(format!("生成 JWT 签名失败: {}", error)))?;
        mac.update(message.as_bytes());
        let signature = URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes());
        let token = format!("{}.{}", message, signature);

        Ok(JwtGenerateResult {
            token,
            header_pretty: pretty_json(&header)?,
            payload_pretty: pretty_json(&payload)?,
            meta: vec!["算法: HS256".to_string(), format!("Secret 长度: {}", secret.chars().count())],
        })
    }

    pub fn decode_jwt(options: &JwtDecodeOptions) -> AppResult<JwtDecodeResult> {
        let token = options.token.trim();
        if token.is_empty() {
            return Err(AppError::InvalidData("JWT 不能为空".to_string()));
        }

        let segments = token.split('.').collect::<Vec<_>>();
        if segments.len() != 3 {
            return Err(AppError::InvalidData("JWT 必须包含 3 段".to_string()));
        }

        let header_bytes = URL_SAFE_NO_PAD
            .decode(segments[0])
            .map_err(|error| AppError::InvalidData(format!("JWT Header 解码失败: {}", error)))?;
        let payload_bytes = URL_SAFE_NO_PAD
            .decode(segments[1])
            .map_err(|error| AppError::InvalidData(format!("JWT Payload 解码失败: {}", error)))?;

        let header: Value = serde_json::from_slice(&header_bytes)
            .map_err(|error| AppError::InvalidData(format!("JWT Header 不是合法 JSON: {}", error)))?;
        let payload: Value = serde_json::from_slice(&payload_bytes)
            .map_err(|error| AppError::InvalidData(format!("JWT Payload 不是合法 JSON: {}", error)))?;

        let algorithm = header
            .get("alg")
            .and_then(Value::as_str)
            .unwrap_or("未知");

        Ok(JwtDecodeResult {
            header_pretty: pretty_json(&header)?,
            payload_pretty: pretty_json(&payload)?,
            signature: segments[2].to_string(),
            meta: vec![format!("算法: {}", algorithm), format!("签名长度: {}", segments[2].len())],
        })
    }
}

fn build_items_result(items: Vec<String>, meta: Vec<String>) -> GeneratorItemsResult {
    GeneratorItemsResult {
        text: items.join("\n"),
        items,
        meta,
    }
}

fn normalize_count(count: usize) -> AppResult<usize> {
    if count == 0 || count > 100 {
        return Err(AppError::InvalidData("批量数量必须在 1 到 100 之间".to_string()));
    }
    Ok(count)
}

fn normalize_length(length: usize, min: usize, max: usize, label: &str) -> AppResult<usize> {
    if length < min || length > max {
        return Err(AppError::InvalidData(format!("{}必须在 {} 到 {} 之间", label, min, max)));
    }
    Ok(length)
}

fn unique_chars(input: &str) -> AppResult<Vec<char>> {
    let chars = input.chars().collect::<Vec<_>>();
    if chars.is_empty() {
        return Err(AppError::InvalidData("字符集不能为空".to_string()));
    }
    Ok(chars)
}

fn validate_min_max(min: i64, max: i64) -> AppResult<()> {
    if min > max {
        return Err(AppError::InvalidData("最小值不能大于最大值".to_string()));
    }
    Ok(())
}

fn build_password_pools(options: &PasswordGenerateOptions) -> AppResult<Vec<Vec<char>>> {
    let mut pools = Vec::new();
    let mut uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".chars().collect::<Vec<_>>();
    let mut lowercase = "abcdefghijklmnopqrstuvwxyz".chars().collect::<Vec<_>>();
    let mut numbers = "0123456789".chars().collect::<Vec<_>>();
    let symbols = SYMBOLS.chars().collect::<Vec<_>>();

    if options.exclude_similar {
        uppercase.retain(|ch| !SIMILAR_CHARS.contains(*ch));
        lowercase.retain(|ch| !SIMILAR_CHARS.contains(*ch));
        numbers.retain(|ch| !SIMILAR_CHARS.contains(*ch));
    }

    if options.include_uppercase {
        pools.push(uppercase);
    }
    if options.include_lowercase {
        pools.push(lowercase);
    }
    if options.include_numbers {
        pools.push(numbers);
    }
    if options.include_symbols {
        pools.push(symbols);
    }

    if pools.is_empty() {
        return Err(AppError::InvalidData("至少启用一种密码字符规则".to_string()));
    }

    Ok(pools)
}

fn parse_json(input: &str, label: &str) -> AppResult<Value> {
    serde_json::from_str::<Value>(input).map_err(|error| AppError::InvalidData(format!("{}解析失败: {}", label, error)))
}

fn pretty_json(value: &Value) -> AppResult<String> {
    serde_json::to_string_pretty(value).map_err(|error| AppError::InvalidData(format!("JSON 美化失败: {}", error)))
}

fn format_hash_algorithm(algorithm: HashAlgorithm) -> &'static str {
    match algorithm {
        HashAlgorithm::Md5 => "MD5",
        HashAlgorithm::Sha1 => "SHA-1",
        HashAlgorithm::Sha256 => "SHA-256",
        HashAlgorithm::Sha512 => "SHA-512",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::generator::{HashAlgorithm, JwtDecodeOptions, JwtGenerateOptions, PasswordGenerateOptions, RandomValueGenerateOptions, RandomValueMode, UuidGenerateOptions};

    #[test]
    fn generate_uuid_batch() {
        let result = GeneratorService::generate_uuid(&UuidGenerateOptions {
            count: 3,
            uppercase: false,
            remove_hyphens: false,
        })
        .unwrap();
        assert_eq!(result.items.len(), 3);
        assert!(result.items[0].contains('-'));
    }

    #[test]
    fn generate_password_meets_length() {
        let result = GeneratorService::generate_password(&PasswordGenerateOptions {
            length: 20,
            count: 2,
            include_uppercase: true,
            include_lowercase: true,
            include_numbers: true,
            include_symbols: true,
            exclude_similar: false,
        })
        .unwrap();
        assert_eq!(result.items.len(), 2);
        assert_eq!(result.items[0].chars().count(), 20);
    }

    #[test]
    fn generate_hash_stable() {
        let result = GeneratorService::generate_hash(&HashGenerateOptions {
            algorithm: HashAlgorithm::Sha256,
            input: "deskforge".to_string(),
        })
        .unwrap();
        assert_eq!(result.value.len(), 64);
    }

    #[test]
    fn generate_and_decode_jwt() {
        let generated = GeneratorService::generate_jwt(&JwtGenerateOptions {
            payload_json: r#"{"sub":"123","role":"admin"}"#.to_string(),
            secret: "deskforge".to_string(),
            header_json: String::new(),
        })
        .unwrap();
        let decoded = GeneratorService::decode_jwt(&JwtDecodeOptions {
            token: generated.token,
        })
        .unwrap();
        assert!(decoded.payload_pretty.contains("admin"));
    }

    #[test]
    fn random_integer_stays_in_range() {
        let result = GeneratorService::generate_random_value(&RandomValueGenerateOptions {
            mode: RandomValueMode::Integer,
            count: 10,
            min: 5,
            max: 9,
            decimal_places: 2,
            length: 8,
            charset: None,
        })
        .unwrap();
        assert_eq!(result.items.len(), 10);
    }
}

